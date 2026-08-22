import { createHash } from "node:crypto";
import { once } from "node:events";
import PDFDocument from "pdfkit";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isSameDay } from "date-fns";
import { decryptCpf } from "../utils/cpfEncryption.js";
import {
  aplicarTolerancia,
  minutosParaDate,
  tipoParaHorarioPrevisto,
  tipoParaTolerancia,
  isDiaUtil,
  aplicarToleranciaComTeto,
  TOLERANCIA_DIARIA_MAX,
} from "../utils/toleranceCalculator.js";

interface RelatorioResult {
  csv: string;
  hash: string;
  filename: string;
}

interface RelatorioPdfResult {
  pdf: Buffer;
  hash: string;
  filename: string;
}

interface RelatorioData {
  lines: string[];
  conteudoSemHash: string;
  hash: string;
  cnpjClean: string;
  year: number;
  month: number;
}

/**
 * Gera o Relatório Mensal de Ponto no layout oficial MTE.
 * Cada página = 1 funcionário com 1 linha por dia do mês.
 * Inclui hash SHA-256 no rodapé para verificação de integridade.
 *
 * Formato CSV (pipe-separated):
 *   EMPREGADOR: <razao> | CNPJ: <cnpj>
 *   PERIODO: <inicio> a <fim>
 *   FUNCIONARIO: <nome> | CPF: <cpf>
 *   Dia|Entrada|S.Intervalo|R.Intervalo|Saída|Horas|Extras|Observação
 *   01|Dom|08:00|12:00|13:00|17:00|08:00|00:00|
 *   ...
 *   ASSINATURA: <nome>
 *   HASH: <sha256>
 *
 * Colunas Horas/Extras:
 *   - Horas: sempre quando houver ENTRY+EXIT (cru com tolerância aplicada), senão "-"
 *   - Extras: só quando houver WorkSchedule e dia útil, senão "-" (traço). Mostra 00:00 quando sem extra.
 *   - Observação: *T tolerância, *E extra, *I intervalo <60min
 *
 * O PDF (gerarRelatorioMensalPdf) reproduz o mesmo conteúdo com o mesmo
 * hash SHA-256, servindo como cópia legível do relatório oficial.
 */
async function buildRelatorio(
  companyId: string,
  year: number,
  month: number
): Promise<RelatorioData> {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const company = await extendedPrisma.company.findUnique({
    where: { id: companyId },
    select: { cnpj: true, name: true },
  });

  if (!company?.cnpj) {
    throw new Error("CNPJ da empresa é obrigatório para gerar o relatório mensal.");
  }

  const employees = await extendedPrisma.user.findMany({
    where: { companyId },
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

  const checkins = await extendedPrisma.checkIn.findMany({
    where: {
      companyId,
      createdAt: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { createdAt: "asc" },
  });

  const lines: string[] = [];

  // Header global
  const cnpjClean = company.cnpj.replace(/\D/g, "");
  const periodInicio = format(monthStart, "dd/MM/yyyy");
  const periodFim = format(monthEnd, "dd/MM/yyyy");

  lines.push(`EMPREGADOR: ${company.name} | CNPJ: ${cnpjClean}`);
  lines.push(`PERIODO: ${periodInicio} a ${periodFim}`);
  lines.push("");

  // Cabeçalho das colunas
  lines.push("Dia|Sem|Entrada|Saida Intervalo|Retorno Intervalo|Saida|Horas|Extras|Observacao");

  // Helper para duração em HH:mm
  const formatDuracao = (minutos: number): string => {
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Uma página por funcionário
  for (const emp of employees) {
    const empCpf = decryptCpf(emp.cpf ?? "").replace(/\D/g, "");
    lines.push(`FUNCIONARIO: ${emp.name} | CPF: ${empCpf}`);
    lines.push("Dia|Sem|Entrada|Saida Intervalo|Retorno Intervalo|Saida|Horas|Extras|Observacao");

    for (const day of days) {
      const dayCheckins = checkins
        .filter((c) => c.userId === emp.id && isSameDay(c.createdAt, day))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // A6 CLT Art.58 §1º segunda parte + Súmula 366 TST — 5 min/batida, máx 10 min/dia (*T).
      // Cru preservado no DB (Port.671 Art.80); ajuste só no effective.
      // Lunch 15 min não consome teto diário.
      let toleranciaConsumida = 0;
      const schedule = (emp as unknown as { workSchedule: unknown }).workSchedule as
        | {
            entryTime: number;
            lunchStart: number;
            lunchEnd: number;
            exitTime: number;
            daysOfWeek: number;
            checkinToleranceMinutes: number;
            lunchToleranceMinutes: number;
          }
        | null;

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
          // Almoço: 15 min por batida, não consome teto diário de 10
          if (diffMin > 0 && diffMin <= tolerancia) {
            effectiveByType.set(c.type, horarioPrevisto);
            obsByType.set(c.type, "*T");
          } else {
            effectiveByType.set(c.type, raw);
          }
        }
      }

      const dayNum = format(day, "dd");
      const daySem = WEEKDAYS[day.getDay()];
      const entryTime = effectiveByType.has("ENTRY") ? format(effectiveByType.get("ENTRY")!, "HH:mm") : "";
      const lunchStartT = effectiveByType.has("LUNCH_START") ? format(effectiveByType.get("LUNCH_START")!, "HH:mm") : "";
      const lunchEndT = effectiveByType.has("LUNCH_END") ? format(effectiveByType.get("LUNCH_END")!, "HH:mm") : "";
      const exitTime = effectiveByType.has("EXIT") ? format(effectiveByType.get("EXIT")!, "HH:mm") : "";

      // P0-2 A-leve: Horas sempre (se houver ENTRY+EXIT), Extras só com escala (senão "-")
      let horasStr = "-";
      let extrasStr = "-";
      const observacoesExtras: string[] = [...Array.from(obsByType.values())];

      const hasEntryExit = effectiveByType.has("ENTRY") && effectiveByType.has("EXIT");
      if (hasEntryExit) {
        const entryEff = effectiveByType.get("ENTRY")!;
        const exitEff = effectiveByType.get("EXIT")!;
        let minutosTrabalhados = (exitEff.getTime() - entryEff.getTime()) / (1000 * 60);
        // desconta intervalo se houver ambos
        if (effectiveByType.has("LUNCH_START") && effectiveByType.has("LUNCH_END")) {
          const ls = effectiveByType.get("LUNCH_START")!;
          const le = effectiveByType.get("LUNCH_END")!;
          const intervaloMin = (le.getTime() - ls.getTime()) / (1000 * 60);
          minutosTrabalhados -= intervaloMin;
          // flag intervalo <60min quando jornada >6h
          if (intervaloMin < 60 && minutosTrabalhados > 360) {
            observacoesExtras.push("*I");
          }
        }
        if (minutosTrabalhados < 0) minutosTrabalhados = 0;
        horasStr = formatDuracao(minutosTrabalhados);

        // Extras só quando há escala e é dia útil
        if (schedule && isDiaUtil(schedule.daysOfWeek, entryEff)) {
          const extrasMin = Math.max(0, minutosTrabalhados - 480); // 8h = 480min
          extrasStr = extrasMin > 0 ? formatDuracao(extrasMin) : "00:00";
          if (extrasMin > 0) observacoesExtras.push("*E");
        } else {
          extrasStr = "-";
        }
      } else {
        // sem ENTRY+EXIT, sem horas
        horasStr = "-";
        extrasStr = "-";
      }

      const observacao = observacoesExtras.filter(Boolean).join(" ");

      lines.push(
        [dayNum, daySem, entryTime, lunchStartT, lunchEndT, exitTime, horasStr, extrasStr, observacao].join("|")
      );
    }

    lines.push(`ASSINATURA: ${emp.name}`);
    lines.push("");
  }

  // Montar conteúdo sem hash para calcular
  const conteudoSemHash = lines.join("\n");

  // Hash SHA-256
  const hash = createHash("sha256").update(conteudoSemHash).digest("hex");

  return { lines, conteudoSemHash, hash, cnpjClean, year, month };
}

/** Gera o relatório mensal no layout oficial MTE em formato CSV. */
export async function gerarRelatorioMensal(
  companyId: string,
  year: number,
  month: number
): Promise<RelatorioResult> {
  const data = await buildRelatorio(companyId, year, month);

  const csv = data.conteudoSemHash + `\nHASH: ${data.hash}`;
  const filename = `RELATORIO_MENSAL_${data.cnpjClean}_${data.year}${String(data.month).padStart(2, "0")}.csv`;

  return { csv, hash: data.hash, filename };
}

/** Gera o relatório mensal em PDF, com o mesmo hash SHA-256 do CSV. */
export async function gerarRelatorioMensalPdf(
  companyId: string,
  year: number,
  month: number
): Promise<RelatorioPdfResult> {
  const data = await buildRelatorio(companyId, year, month);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.info.Title = "Relatorio Mensal de Ponto - Layout Oficial MTE";
  doc.info.Subject = `Relatorio mensal ${year}-${String(month).padStart(2, "0")} (hash SHA-256: ${data.hash})`;
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  doc.font("Courier").fontSize(9);
  for (const line of data.lines) {
    doc.text(line, { lineGap: 2 });
  }
  doc.moveDown();
  doc.text(`HASH: ${data.hash}`);

  doc.end();
  await once(doc, "end");

  const filename = `RELATORIO_MENSAL_${data.cnpjClean}_${data.year}${String(data.month).padStart(2, "0")}.pdf`;

  return { pdf: Buffer.concat(chunks), hash: data.hash, filename };
}