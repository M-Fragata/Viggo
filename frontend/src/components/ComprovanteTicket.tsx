import React from "react";
import { ShieldCheck } from "lucide-react";
import type { ComprovanteDados } from "../services/api";

interface ComprovanteTicketProps {
  dados?: ComprovanteDados | null;
  rawText?: string | null;
}

import logoFragata from '../../public/images/ICONEVERDE.png'

/**
 * Utilitário de fallback para parsear texto de comprovante caso os dados estruturados não venham
 */
function parseRawComprovante(text: string): Partial<ComprovanteDados> {
  const lines = text.split("\n").map((l) => l.trim());
  const getLineVal = (prefix: string) => {
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.replace(prefix, "").trim() : "";
  };

  const nsr = getLineVal("NSR:") || "000000001";
  const dataMatch = text.match(/Data:\s*([^\s]+)\s+Hora:\s*([^\n\r]+)/);
  const data = dataMatch ? dataMatch[1] : "";
  const hora = dataMatch ? dataMatch[2] : "";

  const employeeName = getLineVal("Nome:") || getLineVal("Empregado:") || "";
  const employeeCpf = getLineVal("CPF:") || "";
  const companyCnpj = getLineVal("CNPJ:") || "";
  const inpi = getLineVal("Registro INPI:") || null;

  const hashMatch = text.match(/Hash:\s*([A-F0-9a-f]{32})\s*([A-F0-9a-f]{32})/);
  const hashLinha1 = hashMatch ? hashMatch[1].toUpperCase() : "";
  const hashLinha2 = hashMatch ? hashMatch[2].toUpperCase() : "";

  const assinadoIndex = lines.findIndex((l) => l.includes("Assinado digitalmente por:"));
  const assinadoPor = assinadoIndex !== -1 && lines[assinadoIndex + 1] ? lines[assinadoIndex + 1] : "Fragata Soluções Digitais LTDA";

  const dataHoraEmissao = getLineVal("Data e Hora da emissão:") || `${data} ${hora}`;

  // Tenta encontrar a linha da empresa (anterior ao CNPJ)
  const cnpjIndex = lines.findIndex((l) => l.startsWith("CNPJ:"));
  let companyName = "Empresa";
  if (cnpjIndex > 0 && lines[cnpjIndex - 1] && !lines[cnpjIndex - 1].startsWith("CPF:")) {
    companyName = lines[cnpjIndex - 1];
  } else if (cnpjIndex > 1 && lines[cnpjIndex - 2]) {
    companyName = lines[cnpjIndex - 2];
  }

  return {
    softwareName: "Ponto Fragata",
    nsr,
    data,
    hora,
    employeeName,
    employeeCpf,
    companyName,
    companyCnpj,
    inpi,
    hashLinha1,
    hashLinha2,
    assinadoPor,
    dataHoraEmissao,
  };
}

export const ComprovanteTicket: React.FC<ComprovanteTicketProps> = ({ dados, rawText }) => {
  const parsed = dados || (rawText ? parseRawComprovante(rawText) : null);

  if (!parsed) return null;

  return (
    <div className="w-full max-w-sm mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl text-slate-800 dark:text-slate-100 font-sans relative overflow-hidden transition-all">
      {/* Detalhe estético no topo / Brand Accent */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Cabeçalho */}
      <div className="flex items-start gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          <img src={logoFragata} alt="Fragata" className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block leading-tight">
            {parsed.softwareName || "PONTO FRAGATA"}
          </span>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
            Comprovante do Registro de Ponto
          </h3>
        </div>
      </div>

      {/* Conteúdo Principal estilo Cupom Fiscal */}
      <div className="space-y-3 text-xs sm:text-[13px] leading-relaxed">
        {/* NSR, Data e Hora */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600 dark:text-slate-400">NSR:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-emerald-400 text-sm tracking-wide">
              {parsed.nsr}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <div>
              <span className="font-bold text-slate-600 dark:text-slate-400 mr-1.5">Data:</span>
              <span className="font-medium">{parsed.data}</span>
            </div>
            <div>
              <span className="font-bold text-slate-600 dark:text-slate-400 mr-1.5">Hora:</span>
              <span className="font-medium">{parsed.hora}</span>
            </div>
          </div>
        </div>

        {/* Dados do Empregado */}
        <div className="pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-slate-600 dark:text-slate-400 w-12 shrink-0">Nome:</span>
            <span className="font-medium text-slate-900 dark:text-white truncate">{parsed.employeeName}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-slate-600 dark:text-slate-400 w-12 shrink-0">CPF:</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{parsed.employeeCpf}</span>
          </div>
        </div>

        {/* Dados do Empregador */}
        <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
          <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
            {parsed.companyName}
          </p>
          <div className="flex items-baseline gap-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
            <span className="font-bold">CNPJ:</span>
            <span className="font-mono">{parsed.companyCnpj}</span>
          </div>
        </div>

        {/* Registro INPI (Condicional) */}
        {parsed.inpi && (
          <div className="flex items-baseline gap-1.5 text-xs text-slate-700 dark:text-slate-300 pt-1">
            <span className="font-bold text-slate-600 dark:text-slate-400 shrink-0">Registro INPI:</span>
            <span className="font-mono font-medium">{parsed.inpi}</span>
          </div>
        )}

        {/* Hash SHA-256 */}
        <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px] block mb-1">
            Hash SHA-256:
          </span>
          <div className="font-mono text-[9px] sm:text-[10px] leading-tight text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-black/40 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 break-all select-all">
            {parsed.hashLinha1 && parsed.hashLinha2 ? (
              <>
                <div>{parsed.hashLinha1}</div>
                <div>{parsed.hashLinha2}</div>
              </>
            ) : (
              parsed.hash || "Hash não disponível"
            )}
          </div>
        </div>

        {/* Assinatura e Emissão */}
        <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
          <p className="font-bold text-slate-700 dark:text-slate-300">
            Assinado digitalmente por:
          </p>
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
            {parsed.assinadoPor}
          </p>
          <p className="pt-1 text-[10px]">
            <span className="font-bold">Data e Hora da emissão:</span> {parsed.dataHoraEmissao}
          </p>
        </div>
      </div>

      {/* Selo Visual de Conformidade ICP-Brasil / Portaria 671 */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5 p-2 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl">
          <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-[9.5px] leading-tight">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
              ASSINADO DIGITALMENTE • ICP-BRASIL
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Conformidade Portaria MTE 671/2021 (REP-P)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
