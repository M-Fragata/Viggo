import { createHash } from "node:crypto";
import { once } from "node:events";
import PDFDocument from "pdfkit";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { decryptCpf } from "../utils/cpfEncryption.js";
import {
  isDiaUtil,
  minutosParaDate,
  TOLERANCIA_DIARIA_MAX,
  aplicarToleranciaComTeto,
  tipoParaHorarioPrevisto,
  tipoParaTolerancia,
} from "../utils/toleranceCalculator.js";

export interface DiaEspelho {
  data: string; // YYYY-MM-DD
  diaNumero: string; // "01"
  diaSemana: string; // "Seg"
  entrada: string; // "08:00" ou "-"
  saidaAlmoco: string; // "12:00" ou "-"
  retornoAlmoco: string; // "13:00" ou "-"
  saida: string; // "17:00" ou "-"
  horasTrabalhadas: string; // "08:00" ou "-"
  horasExtras: string; // "00:00" ou "-"
  observacoes: string;
}

export interface ResumoHorasEspelho {
  totalMinutosTrabalhados: number;
  totalMinutosExtras: number;
  totalDiasTrabalhados: number;
  horasTrabalhadasFormatadas: string;
  horasExtrasFormatadas: string;
}

export interface ConsolidadoEspelhoResult {
  periodoInicio: Date;
  periodoFim: Date;
  resumoHoras: ResumoHorasEspelho;
  detalhesDias: DiaEspelho[];
  conteudoTexto: string;
  hashDocumento: string;
}

export interface EspelhoPontoDadosPdf {
  ano: number;
  mes: number;
  status: string;
  hashDocumento: string;
  assinadoEm: Date | null;
  ipAssinatura: string | null;
  userAgent: string | null;
  metodoAuth: string | null;
  motivoRecusa: string | null;
  detalhesDias: DiaEspelho[] | unknown;
  resumoHoras: ResumoHorasEspelho | unknown;
}

export interface EmpresaDadosPdf {
  name: string;
  cnpj: string;
}

export interface ColaboradorDadosPdf {
  name: string;
  cpf: string | null;
}

export function formatarDuracaoMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function consolidarEspelhoFuncionario(
  companyId: string,
  userId: string,
  year: number,
  month: number
): Promise<ConsolidadoEspelhoResult> {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Buscar funcionário com isolamento estrito de companyId
  const employee = await extendedPrisma.user.findFirst({
    where: { id: userId, companyId },
    select: {
      id: true,
      name: true,
      cpf: true,
      workSchedule: {
        select: {
          entryTime: true,
          lunchStart: true,
          lunchEnd: true,
          exitTime: true,
          daysOfWeek: true,
          checkinToleranceMinutes: true,
          lunchToleranceMinutes: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Funcionário não encontrado na empresa especificada.");
  }

  // Buscar batidas com isolamento estrito
  const checkins = await extendedPrisma.checkIn.findMany({
    where: {
      companyId,
      userId,
      createdAt: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { createdAt: "asc" },
  });

  const detalhesDias: DiaEspelho[] = [];
  let totalMinutosTrabalhados = 0;
  let totalMinutosExtras = 0;
  let totalDiasTrabalhados = 0;

  const linhasTexto: string[] = [];
  linhasTexto.push(`USUARIO:${employee.id}|ANO:${year}|MES:${month}`);
  linhasTexto.push("DIA|SEM|ENTRADA|S_ALMOCO|R_ALMOCO|SAIDA|HORAS|EXTRAS|OBS");

  for (const day of days) {
    const dayCheckins = checkins
      .filter((c) => isSameDay(c.createdAt, day))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    let toleranciaConsumida = 0;
    const schedule = employee.workSchedule;

    const effectiveByType = new Map<string, Date>();
    const obsByType = new Map<string, string>();

    for (const c of dayCheckins) {
      const raw = c.createdAt;
      if (!schedule || !isDiaUtil(schedule.daysOfWeek, raw)) {
        effectiveByType.set(c.type, raw);
        continue;
      }

      const minutosPrevistos = tipoParaHorarioPrevisto(c.type, schedule);
      if (minutosPrevistos === null) {
        effectiveByType.set(c.type, raw);
        continue;
      }

      const horarioPrevisto = minutosParaDate(minutosPrevistos, raw);
      const tolerancia = tipoParaTolerancia(c.type, schedule);
      const diffMin = (raw.getTime() - horarioPrevisto.getTime()) / (1000 * 60);

      if (diffMin < 0) {
        effectiveByType.set(c.type, raw);
        continue;
      }

      const isEntryExit = c.type === "ENTRY" || c.type === "EXIT";
      if (isEntryExit) {
        const restante = TOLERANCIA_DIARIA_MAX - toleranciaConsumida;
        const { dentroDoTeto, novoRestante } = aplicarToleranciaComTeto(diffMin, tolerancia, restante);
        if (dentroDoTeto) {
          toleranciaConsumida = TOLERANCIA_DIARIA_MAX - novoRestante;
          effectiveByType.set(c.type, horarioPrevisto);
          obsByType.set(c.type, "*T");
        } else {
          effectiveByType.set(c.type, raw);
        }
      } else {
        if (diffMin <= tolerancia) {
          effectiveByType.set(c.type, horarioPrevisto);
          obsByType.set(c.type, "*T");
        } else {
          effectiveByType.set(c.type, raw);
        }
      }
    }

    const dayNum = format(day, "dd");
    const daySem = WEEKDAYS[day.getDay()] ?? "Seg";
    const entryTime = effectiveByType.has("ENTRY") ? format(effectiveByType.get("ENTRY")!, "HH:mm") : "-";
    const lunchStartT = effectiveByType.has("LUNCH_START") ? format(effectiveByType.get("LUNCH_START")!, "HH:mm") : "-";
    const lunchEndT = effectiveByType.has("LUNCH_END") ? format(effectiveByType.get("LUNCH_END")!, "HH:mm") : "-";
    const exitTime = effectiveByType.has("EXIT") ? format(effectiveByType.get("EXIT")!, "HH:mm") : "-";

    let horasStr = "-";
    let extrasStr = "-";
    const observacoesExtras: string[] = [...Array.from(obsByType.values())];

    const hasEntryExit = effectiveByType.has("ENTRY") && effectiveByType.has("EXIT");
    if (hasEntryExit) {
      totalDiasTrabalhados++;
      const entryEff = effectiveByType.get("ENTRY")!;
      const exitEff = effectiveByType.get("EXIT")!;
      let minutosTrabalhados = (exitEff.getTime() - entryEff.getTime()) / (1000 * 60);

      if (effectiveByType.has("LUNCH_START") && effectiveByType.has("LUNCH_END")) {
        const ls = effectiveByType.get("LUNCH_START")!;
        const le = effectiveByType.get("LUNCH_END")!;
        const intervaloMin = (le.getTime() - ls.getTime()) / (1000 * 60);
        minutosTrabalhados -= intervaloMin;
        if (intervaloMin < 60 && minutosTrabalhados > 360) {
          observacoesExtras.push("*I");
        }
      }
      if (minutosTrabalhados < 0) minutosTrabalhados = 0;
      totalMinutosTrabalhados += minutosTrabalhados;
      horasStr = formatarDuracaoMinutos(minutosTrabalhados);

      if (schedule && isDiaUtil(schedule.daysOfWeek, entryEff)) {
        const extrasMin = Math.max(0, minutosTrabalhados - 480);
        if (extrasMin > 0) {
          totalMinutosExtras += extrasMin;
          extrasStr = formatarDuracaoMinutos(extrasMin);
          observacoesExtras.push("*E");
        } else {
          extrasStr = "00:00";
        }
      }
    }

    const obsStr = observacoesExtras.filter(Boolean).join(" ");

    detalhesDias.push({
      data: format(day, "yyyy-MM-dd"),
      diaNumero: dayNum,
      diaSemana: daySem,
      entrada: entryTime,
      saidaAlmoco: lunchStartT,
      retornoAlmoco: lunchEndT,
      saida: exitTime,
      horasTrabalhadas: horasStr,
      horasExtras: extrasStr,
      observacoes: obsStr,
    });

    linhasTexto.push([dayNum, daySem, entryTime, lunchStartT, lunchEndT, exitTime, horasStr, extrasStr, obsStr].join("|"));
  }

  const conteudoTexto = linhasTexto.join("\n");
  const hashDocumento = createHash("sha256").update(conteudoTexto).digest("hex");

  return {
    periodoInicio: monthStart,
    periodoFim: monthEnd,
    resumoHoras: {
      totalMinutosTrabalhados,
      totalMinutosExtras,
      totalDiasTrabalhados,
      horasTrabalhadasFormatadas: formatarDuracaoMinutos(totalMinutosTrabalhados),
      horasExtrasFormatadas: formatarDuracaoMinutos(totalMinutosExtras),
    },
    detalhesDias,
    conteudoTexto,
    hashDocumento,
  };
}

export async function gerarEspelhoPdf(
  espelho: EspelhoPontoDadosPdf,
  company: EmpresaDadosPdf,
  user: ColaboradorDadosPdf
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const cnpjClean = company.cnpj.replace(/\D/g, "");
  let cpfDecrypted = "";
  try {
    cpfDecrypted = user.cpf ? decryptCpf(user.cpf).replace(/\D/g, "") : "";
  } catch {
    cpfDecrypted = (user.cpf || "").replace(/\D/g, "");
  }
  const cpfFormatado = cpfDecrypted.length === 11
    ? cpfDecrypted.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    : cpfDecrypted || "Não informado";

  // Header Principal
  doc.rect(36, 36, 523, 50).fill("#f8fafc").stroke("#cbd5e1");
  doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold");
  doc.text("ESPELHO DE PONTO ELETRÔNICO (REP-P)", 46, 44);
  doc.fontSize(8).font("Helvetica");
  doc.fillColor("#475569");
  doc.text(`Empregador: ${company.name} | CNPJ: ${cnpjClean}`, 46, 60);
  doc.text(
    `Colaborador: ${user.name} | CPF: ${cpfFormatado} | Período: ${String(espelho.mes).padStart(2, "0")}/${espelho.ano}`,
    46,
    72
  );

  // Tabela de Marcações
  const startY = 96;
  doc.rect(36, startY, 523, 18).fill("#0f172a");
  doc.fillColor("#ffffff").fontSize(7.5).font("Helvetica-Bold");

  const cols = [
    { label: "Dia", x: 42, w: 25 },
    { label: "Sem", x: 67, w: 25 },
    { label: "Entrada", x: 97, w: 45 },
    { label: "S. Almoço", x: 147, w: 50 },
    { label: "R. Almoço", x: 202, w: 50 },
    { label: "Saída", x: 257, w: 45 },
    { label: "Horas", x: 307, w: 45 },
    { label: "Extras", x: 357, w: 45 },
    { label: "Observações", x: 407, w: 140 },
  ];

  for (const c of cols) {
    doc.text(c.label, c.x, startY + 5);
  }

  let rowY = startY + 18;
  const dias: DiaEspelho[] = Array.isArray(espelho.detalhesDias) ? (espelho.detalhesDias as DiaEspelho[]) : [];

  doc.font("Helvetica").fontSize(7);
  for (let i = 0; i < dias.length; i++) {
    const d = dias[i];
    if (!d) continue;

    const isEven = i % 2 === 0;
    if (isEven) {
      doc.rect(36, rowY, 523, 14).fill("#f1f5f9");
    }

    doc.fillColor("#1e293b");
    doc.text(d.diaNumero || "-", 42, rowY + 3);
    doc.text(d.diaSemana || "-", 67, rowY + 3);
    doc.text(d.entrada || "-", 97, rowY + 3);
    doc.text(d.saidaAlmoco || "-", 147, rowY + 3);
    doc.text(d.retornoAlmoco || "-", 202, rowY + 3);
    doc.text(d.saida || "-", 257, rowY + 3);
    doc.text(d.horasTrabalhadas || "-", 307, rowY + 3);
    doc.text(d.horasExtras || "-", 357, rowY + 3);
    doc.text(d.observacoes || "-", 407, rowY + 3);

    rowY += 14;
  }

  // Resumo de Horas
  rowY += 6;
  doc.rect(36, rowY, 523, 24).fill("#e2e8f0");
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
  const resumo = (espelho.resumoHoras || {}) as Partial<ResumoHorasEspelho>;
  doc.text(
    `TOTAIS DO MÊS: Dias Trabalhados: ${resumo.totalDiasTrabalhados ?? 0} | Horas Trabalhadas: ${resumo.horasTrabalhadasFormatadas ?? "00:00"} | Horas Extras: ${resumo.horasExtrasFormatadas ?? "00:00"}`,
    46,
    rowY + 7
  );

  // Bloco de Assinatura Digital
  rowY += 32;
  if (espelho.status === "ASSINADO") {
    doc.rect(36, rowY, 523, 64).fill("#ecfdf5").stroke("#10b981");
    doc.fillColor("#065f46").font("Helvetica-Bold").fontSize(9);
    doc.text("✓ DOCUMENTO ASSINADO ELETRONICAMENTE", 46, rowY + 8);
    doc.font("Helvetica").fontSize(7.5).fillColor("#047857");
    doc.text(
      `Signatário: ${user.name} (CPF: ${cpfFormatado}) | Método: Autenticação Segura (${espelho.metodoAuth || "SENHA"})`,
      46,
      rowY + 22
    );
    doc.text(
      `Data/Hora: ${espelho.assinadoEm ? format(new Date(espelho.assinadoEm), "dd/MM/yyyy HH:mm:ss 'UTC'", { locale: ptBR }) : "-"} | IP: ${espelho.ipAssinatura || "-"}`,
      46,
      rowY + 34
    );
    doc.text(`Hash de Integridade SHA-256: ${espelho.hashDocumento}`, 46, rowY + 46);
    doc.text("Conformidade Legal: Portaria MTE nº 671/2021 (Art. 83/84) e Lei Federal nº 14.063/2020.", 46, rowY + 54);
  } else if (espelho.status === "CONTESTADO") {
    doc.rect(36, rowY, 523, 46).fill("#fef2f2").stroke("#ef4444");
    doc.fillColor("#991b1b").font("Helvetica-Bold").fontSize(9);
    doc.text("⚠ ESPELHO CONTESTADO PELO COLABORADOR (EM REVISÃO)", 46, rowY + 8);
    doc.font("Helvetica").fontSize(7.5).fillColor("#b91c1c");
    doc.text(`Motivo da Contestação: ${espelho.motivoRecusa || "Não informado"}`, 46, rowY + 22);
    doc.text(`Hash Provisório SHA-256: ${espelho.hashDocumento}`, 46, rowY + 34);
  } else {
    doc.rect(36, rowY, 523, 40).fill("#fffbeb").stroke("#f59e0b");
    doc.fillColor("#92400e").font("Helvetica-Bold").fontSize(9);
    doc.text("⏳ AGUARDANDO ASSINATURA ELETRÔNICA DO COLABORADOR", 46, rowY + 8);
    doc.font("Helvetica").fontSize(7.5).fillColor("#b45309");
    doc.text(
      "Este espelho foi liberado pelo departamento de Recursos Humanos e aguarda conferência e aceite eletrônico.",
      46,
      rowY + 22
    );
  }

  doc.end();
  await once(doc, "end");
  return Buffer.concat(chunks);
}
