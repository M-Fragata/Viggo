import { createHash } from "node:crypto";

interface ComprovanteData {
  nsr: number;
  companyName: string;
  companyCnpj: string;
  employeeName: string;
  employeeCpf: string;
  checkinType: string;
  checkinDate: Date;
  latitude: number;
  longitude: number;
}

const TIPO_MAP: Record<string, string> = {
  ENTRY: "Entrada",
  LUNCH_START: "Saida Intervalo",
  LUNCH_END: "Retorno Intervalo",
  EXIT: "Saida",
};

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mi}:${ss}`;
}

function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Gera comprovante de registro de ponto conforme Anexo III da Portaria 671/2021.
 * Inclui hash SHA-256 para verificacao de integridade.
 */
export function gerarComprovante(data: ComprovanteData): {
  texto: string;
  hashVerificacao: string;
} {
  const nsrFormatted = String(data.nsr).padStart(6, "0");

  const linhas = [
    "=== COMPROVANTE DE REGISTRO DE PONTO ===",
    "",
    `Empregador: ${data.companyName}`,
    `CNPJ: ${formatCnpj(data.companyCnpj)}`,
    "",
    `Empregado: ${data.employeeName}`,
    `CPF: ${formatCpf(data.employeeCpf)}`,
    "",
    `Data: ${formatDate(data.checkinDate)}`,
    `Hora: ${formatTime(data.checkinDate)}`,
    `Tipo: ${TIPO_MAP[data.checkinType] ?? data.checkinType}`,
    `NSR:  ${nsrFormatted}`,
    "",
    `Localizacao: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`,
  ];

  const textoSemHash = linhas.join("\n");

  const hashVerificacao = createHash("sha256")
    .update(textoSemHash)
    .digest("hex");

  const texto = textoSemHash + `\nHash: ${hashVerificacao}`;

  return { texto, hashVerificacao };
}
