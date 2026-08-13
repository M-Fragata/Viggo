import { createHash } from "node:crypto";
import { once } from "node:events";
import PDFDocument from "pdfkit";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isSameDay } from "date-fns";
import { decryptCpf } from "../utils/cpfEncryption.js";

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
 *   Dia|Entrada|S.Intervalo|R.Intervalo|Saída|Observação
 *   01|Dom|08:00|12:00|13:00|17:00|
 *   ...
 *   ASSINATURA: <nome>
 *   HASH: <sha256>
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
    select: { id: true, name: true, cpf: true },
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
  lines.push("Dia|Sem|Entrada|Saida Intervalo|Retorno Intervalo|Saida|Observacao");

  // Uma página por funcionário
  for (const emp of employees) {
    const empCpf = decryptCpf(emp.cpf ?? "").replace(/\D/g, "");
    lines.push(`FUNCIONARIO: ${emp.name} | CPF: ${empCpf}`);
    lines.push("Dia|Sem|Entrada|Saida Intervalo|Retorno Intervalo|Saida|Observacao");

    for (const day of days) {
      const dayCheckins = checkins.filter(
        (c) => c.userId === emp.id && isSameDay(c.createdAt, day)
      );

      const entry = dayCheckins.find((c) => c.type === "ENTRY");
      const lunchStart = dayCheckins.find((c) => c.type === "LUNCH_START");
      const lunchEnd = dayCheckins.find((c) => c.type === "LUNCH_END");
      const exit = dayCheckins.find((c) => c.type === "EXIT");

      const dayNum = format(day, "dd");
      const daySem = WEEKDAYS[day.getDay()];
      const entryTime = entry ? format(entry.createdAt, "HH:mm") : "";
      const lunchStartT = lunchStart ? format(lunchStart.createdAt, "HH:mm") : "";
      const lunchEndT = lunchEnd ? format(lunchEnd.createdAt, "HH:mm") : "";
      const exitTime = exit ? format(exit.createdAt, "HH:mm") : "";

      lines.push(
        [dayNum, daySem, entryTime, lunchStartT, lunchEndT, exitTime, ""].join("|")
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