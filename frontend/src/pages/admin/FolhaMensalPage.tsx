import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/common/PageHeader";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function FolhaMensalPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Folha Mensal & Espelho MTE"
        subtitle="Consolidação mensal e arquivos fiscais (Art. 78 §5º-A)"
        helpText="Gere e audite o espelho de ponto consolidado do mês, com cálculo de horas trabalhadas, extras, faltas e exportação oficial dos arquivos fiscais AFD e AFDT (Portaria 671 MTE)."
      />
      <FolhaMensalSection />
      <AfdExportSection />
      <AejExportSection />
    </div>
  );
}

function FolhaMensalSection() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const years: string[] = ["2026"];

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
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Relatório Mensal de Ponto (Art. 78 §5º-A)</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Exporta o relatório oficial MTE com hash SHA-256 de verificação</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm font-medium"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm font-medium"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => handleGenerate("csv")}
          disabled={isGenerating}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {isGenerating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {isGenerating ? "Gerando..." : "Exportar CSV"}
        </button>

        <button
          onClick={() => handleGenerate("pdf")}
          disabled={isGenerating}
          className="px-6 py-2.5 bg-white dark:bg-white/5 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {isGenerating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {isGenerating ? "Gerando..." : "Exportar PDF"}
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
          Selecione o mês e ano desejados e clique em <strong>"Exportar CSV"</strong> (arquivo oficial) ou <strong>"Exportar PDF"</strong> (cópia legível) para baixar o relatório de ponto.
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs text-center mt-2">
          O arquivo inclui hash SHA-256 no rodapé para verificação de integridade conforme Art. 78 §5º-A da CLT.
        </p>
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
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Exportar AFD — Arquivo Fonte de Dados (Art. 78 §5º)</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gera o arquivo AFD no leiaute Anexo II da Portaria 671/2021 para auditoria do MTE</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm font-medium"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data Final</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm font-medium"
          />
        </div>

        <button
          onClick={handleExportAfd}
          disabled={isExporting}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {isExporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {isExporting ? "Gerando..." : "Exportar AFD"}
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
          Selecione o período desejado e clique em <strong>"Exportar AFD"</strong> para baixar o arquivo no formato Anexo II da Portaria MTE nº 671/2021.
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs text-center mt-2">
          O arquivo contém Header (Tipo 1), registros de detalhe (Tipo 2) e Trailer (Tipo 9), separados por pipe (|).
        </p>
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
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Exportar AEJ — Arquivo Eletrônico de Jornada (Art. 78 §5º-B)</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gera o AEJ no leiaute Anexo V da Portaria 671/2021 (horários contratuais + marcações)</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm font-medium"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data Final</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm font-medium"
          />
        </div>

        <button
          onClick={handleExportAej}
          disabled={isExporting}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {isExporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {isExporting ? "Gerando..." : "Exportar AEJ"}
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
          Selecione o período e clique em <strong>"Exportar AEJ"</strong> para baixar o Anexo V (Tipo 1 header, Tipo 2 horários, Tipo 3 marcações, Tipo 9 trailer).
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs text-center mt-2">
          Inclui hash SHA-256 + assinatura A1 quando CERT_A1_PATH preenchido no .env.
        </p>
      </div>
    </div>
  );
}
