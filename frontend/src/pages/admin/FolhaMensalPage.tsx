import { useState } from "react";
import {
  FileText,
  Loader2,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  CalendarDays,
  Info,
  Clock,
  Building2,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/common/PageHeader";
import { FechamentoAssinaturasSection } from "../../components/admin/FechamentoAssinaturasSection";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function FolhaMensalPage() {
  return (
    <div className="w-full space-y-6 min-w-0">
      <PageHeader
        title="Folha Mensal & Espelho MTE"
        subtitle="Ciclo de fechamento, assinaturas eletrônicas e arquivos fiscais obrigatórios (Portaria 671/2021 MTE / Lei 14.063/2020)"
        helpText="Libere os espelhos de ponto para assinatura eletrônica dos colaboradores, gere relatórios mensais consolidados para fechamento da folha e emita os arquivos fiscais oficiais (AFD e AEJ) exigidos pelo Ministério do Trabalho."
      />

      {/* TÓPICO 1: CICLO DE FECHAMENTO & ASSINATURAS ELETRÔNICAS */}
      <section className="space-y-4">
        <FechamentoAssinaturasSection />
      </section>

      {/* TÓPICO 2: FOLHA MENSAL */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Relatórios de Fechamento de Folha
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                Rotina Mensal / RH
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Relatório consolidado de horas, extras e espelho de ponto para fechamento da folha e contabilidade.
            </p>
          </div>
        </div>

        <FolhaMensalSection />
      </section>

      {/* TÓPICO 2: ESPELHO MTE & ARQUIVOS FISCAIS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Espelho MTE & Arquivos Fiscais
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                Fiscalização & Auditoria
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Arquivos técnicos oficiais no formato exigido pela Portaria MTE nº 671/2021 para auditores fiscais do trabalho.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <AfdExportSection />
          <AejExportSection />
        </div>
      </section>
    </div>
  );
}

function FolhaMensalSection() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const currentYear = now.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const years: string[] = [
    String(currentYear),
    String(currentYear - 1),
    String(currentYear - 2),
  ];

  async function handleGenerate(format: "csv" | "pdf") {
    setIsGenerating(true);
    try {
      const blob = await api.checkins.exportRelatorioMensal(selectedYear, selectedMonth, format);
      if (!blob || blob.size === 0) {
        alert("Nenhum dado encontrado para este período.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RELATORIO_MENSAL_${selectedYear}${String(selectedMonth).padStart(2, "0")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar relatório mensal:", error);
      alert(error instanceof Error ? error.message : "Erro ao gerar relatório mensal. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-7 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Relatório Mensal de Ponto (Art. 78 §5º-A)
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Gere o espelho mensal de todos os funcionários com cálculo consolidado de horas.
          </p>
        </div>
      </div>

      {/* Seletores e Ações */}
      <div className="flex flex-row flex-wrap items-end gap-3 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
        <div className="flex flex-col gap-1.5 min-w-[130px]">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays size={13} className="text-emerald-500" />
            Mês de Referência
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium cursor-pointer shadow-xs"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-emerald-500" />
            Ano
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium cursor-pointer shadow-xs"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 items-stretch sm:items-center sm:ml-auto w-full sm:w-auto">
          <button
            onClick={() => handleGenerate("csv")}
            disabled={isGenerating}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm shadow-xs active:scale-[0.98]"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isGenerating ? "Gerando..." : "Exportar CSV (Planilha)"}
          </button>

          <button
            onClick={() => handleGenerate("pdf")}
            disabled={isGenerating}
            className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-white/5 border border-emerald-600 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm shadow-xs active:scale-[0.98]"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isGenerating ? "Gerando..." : "Exportar PDF (Espelho)"}
          </button>
        </div>
      </div>

      {/* Painel Informativo Retrátil / SOBRE */}
      <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/80 dark:bg-white/[0.02] transition-colors">
        <button
          type="button"
          onClick={() => setShowAbout((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-colors cursor-pointer select-none group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Info size={17} />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                Sobre o Relatório Mensal & Quando Usar
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clique para ver o que contém este relatório, quando emitir e sua validade jurídica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0 ml-3">
            <span className="hidden sm:inline">{showAbout ? "Ocultar" : "Saiba mais"}</span>
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${showAbout ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {showAbout && (
          <div className="p-5 pt-2 border-t border-slate-200/60 dark:border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  O que é?
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  É o espelho detalhado com o resumo de cada colaborador: total de horas trabalhadas, horas extras, atrasos, faltas e todas as batidas diárias.
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <CalendarDays size={14} className="text-emerald-500" />
                  Quando usar?
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Use mensalmente no <strong>fechamento da folha de pagamento</strong> para envio à contabilidade/RH e para colher a assinatura dos funcionários (via PDF).
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Validade Legal
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Emitido com hash criptográfico SHA-256 no rodapé, atendendo integralmente aos requisitos do <strong>Art. 78 §5º-A</strong> da Portaria MTE 671/2021.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AfdExportSection() {
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  async function handleExportAfd() {
    if (startDate > endDate) {
      alert("A data inicial não pode ser maior que a data final.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await api.checkins.exportAfd(startDate, endDate);
      if (!blob || blob.size === 0) {
        alert("Nenhum registro encontrado para o período solicitado.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AFD_${startDate}_${endDate}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar AFD:", error);
      alert(error instanceof Error ? error.message : "Erro ao exportar AFD. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-7 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Exportar AFD — Arquivo Fonte de Dados
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              Art. 78 §5º / Anexo II
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Arquivo texto padronizado contendo o histórico eletrônico bruto de batidas.
          </p>
        </div>
      </div>

      {/* Seletores e Ações */}
      <div className="flex flex-row flex-wrap items-end gap-3 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Data Inicial
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium shadow-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Data Final
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium shadow-xs"
          />
        </div>

        <div className="sm:ml-auto">
          <button
            onClick={handleExportAfd}
            disabled={isExporting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm shadow-xs active:scale-[0.98]"
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isExporting ? "Gerando..." : "Exportar Arquivo AFD (.txt)"}
          </button>
        </div>
      </div>

      {/* Painel Informativo Retrátil / SOBRE AFD */}
      <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/80 dark:bg-white/[0.02] transition-colors">
        <button
          type="button"
          onClick={() => setShowAbout((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-colors cursor-pointer select-none group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <HelpCircle size={17} />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                Sobre o Arquivo Fonte de Dados (AFD) & Quando Usar
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clique para entender o formato bruto exigido exclusivamente em auditorias do MTE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0 ml-3">
            <span className="hidden sm:inline">{showAbout ? "Ocultar" : "Saiba mais"}</span>
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${showAbout ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {showAbout && (
          <div className="p-5 pt-2 border-t border-slate-200/60 dark:border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <CheckCircle2 size={14} className="text-blue-500" />
                  O que é?
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Registro bruto, sequencial e inviolável de todas as marcações de ponto realizadas no sistema (REP-P) durante o período selecionado.
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <Building2 size={14} className="text-blue-500" />
                  Quando usar?
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Exclusivamente quando <strong>solicitado por um Auditor Fiscal do Trabalho</strong> ou perícia judicial para conferência das marcações originais.
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <FileText size={14} className="text-blue-500" />
                  Estrutura Técnica
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Formato padronizado Anexo II da Portaria 671/2021 (Tipo 1: Cabeçalho com CNPJ, Tipo 2: Marcações com NSR e PIS/CPF, Tipo 9: Trailer).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AejExportSection() {
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  async function handleExportAej() {
    if (startDate > endDate) {
      alert("A data inicial não pode ser maior que a data final.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await api.checkins.exportAej(startDate, endDate);
      if (!blob || blob.size === 0) {
        alert("Nenhum registro encontrado para o período solicitado.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AEJ_${startDate}_${endDate}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar AEJ:", error);
      alert(error instanceof Error ? error.message : "Erro ao exportar AEJ. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-7 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Exportar AEJ — Arquivo Eletrônico de Jornada
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              Art. 78 §5º-B / Anexo V
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Arquivo eletrônico consolidando contratos, horários contratuais e batidas tratadas.
          </p>
        </div>
      </div>

      {/* Seletores e Ações */}
      <div className="flex flex-row flex-wrap items-end gap-3 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Data Inicial
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium shadow-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Data Final
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium shadow-xs"
          />
        </div>

        <div className="sm:ml-auto">
          <button
            onClick={handleExportAej}
            disabled={isExporting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm shadow-xs active:scale-[0.98]"
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isExporting ? "Gerando..." : "Exportar Arquivo AEJ (.txt)"}
          </button>
        </div>
      </div>

      {/* Painel Informativo Retrátil / SOBRE AEJ */}
      <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/80 dark:bg-white/[0.02] transition-colors">
        <button
          type="button"
          onClick={() => setShowAbout((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-colors cursor-pointer select-none group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <HelpCircle size={17} />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                Sobre o Arquivo Eletrônico de Jornada (AEJ) & Quando Usar
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clique para entender as exigências da fiscalização eletrônica do MTE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0 ml-3">
            <span className="hidden sm:inline">{showAbout ? "Ocultar" : "Saiba mais"}</span>
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${showAbout ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {showAbout && (
          <div className="p-5 pt-2 border-t border-slate-200/60 dark:border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <CheckCircle2 size={14} className="text-blue-500" />
                  O que é?
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Arquivo oficial que unifica dados da empresa, relação de empregados, jornadas contratuais programadas e as marcações de ponto tratadas.
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <Building2 size={14} className="text-blue-500" />
                  Quando usar?
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Solicitado por <strong>Auditores Fiscais do MTE</strong> em fiscalizações de conformidade de jornada para cruzar horários contratuais e batidas.
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  <ShieldCheck size={14} className="text-blue-500" />
                  Integridade & Assinatura
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Gerado no formato Anexo V da Portaria MTE 671/2021, com autenticação criptográfica SHA-256 e assinatura eletrônica para auditoria fiscal.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
