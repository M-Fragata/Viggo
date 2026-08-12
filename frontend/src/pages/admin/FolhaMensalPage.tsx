import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { api } from "../../services/api";
import { DashboardPageHeader } from "../../components/admin/DashboardPageHeader";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function FolhaMensalPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardPageHeader />
      <FolhaMensalSection />
      <AfdExportSection />
    </div>
  );
}

function FolhaMensalSection() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const years: string[] = ["2026"];

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const blob = await api.checkins.exportRelatorioMensal(selectedYear, selectedMonth);
      if (!blob || blob.size === 0) {
        alert("Nenhum dado encontrado para este período.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RELATORIO_MENSAL_${selectedYear}${String(selectedMonth).padStart(2, "0")}.csv`;
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
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Relatório Mensal de Ponto (Art. 78 §5º-A)</h2>
          <p className="text-slate-500 text-sm">Exporta o relatório oficial MTE com hash SHA-256 de verificação</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {isGenerating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {isGenerating ? "Gerando..." : "Exportar Relatório"}
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <FileText className="mx-auto text-slate-300 mb-3" size={40} />
        <p className="text-slate-500 text-sm text-center">
          Selecione o mês e ano desejados e clique em <strong>"Exportar Relatório"</strong> para baixar o arquivo CSV com o relatório oficial de ponto.
        </p>
        <p className="text-slate-400 text-xs text-center mt-2">
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
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Exportar AFD — Arquivo Fonte de Dados (Art. 78 §5º)</h2>
          <p className="text-slate-500 text-sm">Gera o arquivo AFD no leiaute Anexo II da Portaria 671/2021 para auditoria do MTE</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Final</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
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

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <FileText className="mx-auto text-slate-300 mb-3" size={40} />
        <p className="text-slate-500 text-sm text-center">
          Selecione o período desejado e clique em <strong>"Exportar AFD"</strong> para baixar o arquivo no formato Anexo II da Portaria MTE nº 671/2021.
        </p>
        <p className="text-slate-400 text-xs text-center mt-2">
          O arquivo contém Header (Tipo 1), registros de detalhe (Tipo 2) e Trailer (Tipo 9), separados por pipe (|).
        </p>
      </div>
    </div>
  );
}
