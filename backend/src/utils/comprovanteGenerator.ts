import { createHash } from "node:crypto";
import { Env } from "./environment.js";

export interface ComprovanteData {
  nsr: number;
  companyName: string;
  companyCnpj: string;
  employeeName: string;
  employeeCpf: string;
  checkinType?: string;
  checkinDate: Date;
  latitude?: number | null;
  longitude?: number | null;
  emissaoDate?: Date;
  inpi?: string;
  softwareHouseName?: string;
  softwareName?: string;
}

export interface ComprovanteEstruturado {
  softwareName: string;
  nsr: string;
  data: string;
  hora: string;
  tipo: string;
  employeeName: string;
  employeeCpf: string;
  companyName: string;
  companyCnpj: string;
  inpi: string | null;
  hash: string;
  hashLinha1: string;
  hashLinha2: string;
  assinadoPor: string;
  dataHoraEmissao: string;
  localizacao: string;
}

const TIPO_MAP: Record<string, string> = {
  ENTRY: "Entrada",
  LUNCH_START: "Saída Intervalo",
  LUNCH_END: "Retorno Intervalo",
  EXIT: "Saída",
};

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(date: Date, includeSeconds = true): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  if (!includeSeconds) return `${hh}:${mi}`;
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
 * Gera comprovante de registro de ponto conforme Anexo III da Portaria 671/2021 (REP-P).
 * Formato alinhado ao padrão de mercado (Secullum / Ponto Fragata), com NSR de 9 dígitos,
 * hash SHA-256 em maiúsculo formatado e dados estruturados.
 */
export function gerarComprovante(data: ComprovanteData): {
  texto: string;
  hashVerificacao: string;
  dados: ComprovanteEstruturado;
} {
  const softwareName = data.softwareName ?? Env.SOFTWARE_NAME ?? "Ponto Fragata";
  const softwareHouse = data.softwareHouseName ?? Env.SOFTWARE_HOUSE_NAME ?? "Fragata Soluções Digitais LTDA";
  const inpiValue = data.inpi ?? Env.INPI ?? process.env.INPI ?? "";
  const nsrFormatted = String(data.nsr).padStart(9, "0");
  const emissao = data.emissaoDate ?? new Date();

  const dataStr = formatDate(data.checkinDate);
  const horaStr = formatTime(data.checkinDate, false);
  const tipoStr = TIPO_MAP[data.checkinType ?? "ENTRY"] ?? data.checkinType ?? "Marcação";
  const emissaoStr = `${formatDate(emissao)} ${formatTime(emissao, true)}`;

  const localizacaoStr =
    data.latitude != null && data.longitude != null
      ? `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
      : "Não informada (GPS negado)";

  // Linhas base para cálculo do hash inviolável
  const linhasCorpo = [
    "Comprovante do Registro de Ponto",
    "",
    `NSR:  ${nsrFormatted}`,
    `Data: ${dataStr}    Hora: ${horaStr}`,
    "",
    `Nome: ${data.employeeName}`,
    `CPF:  ${formatCpf(data.employeeCpf)}`,
    "",
    data.companyName,
    "",
    `CNPJ: ${formatCnpj(data.companyCnpj)}`,
  ];

  if (inpiValue.trim()) {
    linhasCorpo.push(`Registro INPI: ${inpiValue.trim()}`);
  }

  const textoParaHash = linhasCorpo.join("\n");

  const hashRaw = createHash("sha256")
    .update(textoParaHash)
    .digest("hex");

  const hashUpper = hashRaw.toUpperCase();
  const hashLinha1 = hashUpper.slice(0, 32);
  const hashLinha2 = hashUpper.slice(32);

  const linhasFinais = [
    ...linhasCorpo,
    `Hash: ${hashLinha1}`,
    `      ${hashLinha2}`,
    "",
    "Assinado digitalmente por:",
    softwareHouse,
    "",
    `Data e Hora da emissão: ${emissaoStr}`,
  ];

  const texto = linhasFinais.join("\n");

  const dados: ComprovanteEstruturado = {
    softwareName,
    nsr: nsrFormatted,
    data: dataStr,
    hora: horaStr,
    tipo: tipoStr,
    employeeName: data.employeeName,
    employeeCpf: formatCpf(data.employeeCpf),
    companyName: data.companyName,
    companyCnpj: formatCnpj(data.companyCnpj),
    inpi: inpiValue.trim() ? inpiValue.trim() : null,
    hash: hashUpper,
    hashLinha1,
    hashLinha2,
    assinadoPor: softwareHouse,
    dataHoraEmissao: emissaoStr,
    localizacao: localizacaoStr,
  };

  return {
    texto,
    hashVerificacao: hashUpper,
    dados,
  };
}
