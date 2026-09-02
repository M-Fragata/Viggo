import { useState, useEffect } from "react";
import {
  FileSignature,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Loader2,
  Search,
  MessageSquareWarning,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type ListarEspelhosEmpresaResponse,
  type ItemEspelhoEmpresa,
} from "../../services/api";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function FechamentoAssinaturasSection() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const currentYear = now.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [dados, setDados] = useState<ListarEspelhosEmpresaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [liberando, setLiberando] = useState(false);

  // Filtros de busca
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "ASSINADO" | "LIBERADO" | "CONTESTADO" | "NAO_GERADO">("TODOS");

  // Modal Ver Contestação
  const [modalContestacaoItem, setModalContestacaoItem] = useState<ItemEspelhoEmpresa | null>(null);

  async function carregarEspelhosEmpresa() {
    try {
      setLoading(true);
      const res = await api.espelhos.listarEmpresa(selectedYear, selectedMonth);
      setDados(res);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao buscar espelhos da empresa.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    api.espelhos
      .listarEmpresa(selectedYear, selectedMonth)
      .then((res) => {
        if (ativo) setDados(res);
      })
      .catch((err: unknown) => {
        if (ativo) {
          const errorMsg = err instanceof Error ? err.message : "Erro ao buscar espelhos da empresa.";
          toast.error(errorMsg);
        }
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [selectedYear, selectedMonth]);

  async function handleLiberarFechamento() {
    try {
      setLiberando(true);
      const res = await api.espelhos.liberarFechamento(selectedYear, selectedMonth);
      toast.success(res.message || "Espelhos liberados para assinatura com sucesso!");
      await carregarEspelhosEmpresa();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao liberar espelhos.";
      toast.error(errorMsg);
    } finally {
      setLiberando(false);
    }
  }

  function handleDownloadPdf(espelhoId?: string) {
    if (!espelhoId) return;
    const url = api.espelhos.downloadPdfUrl(espelhoId);
    window.open(url, "_blank");
  }

  const itemsFiltrados = (dados?.items || []).filter((item) => {
    const matchesText =
      item.userName.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      item.userEmail.toLowerCase().includes(filtroTexto.toLowerCase());

    if (!matchesText) return false;

    if (filtroStatus === "TODOS") return true;
    return item.status === filtroStatus;
  });

  const years = [String(currentYear), String(currentYear - 1), String(currentYear - 2)];

  return (
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-7 space-y-6 transition-colors">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-200/80 dark:border-white/5">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSignature className="text-emerald-500" size={22} />
            Ciclo de Fechamento & Assinatura Eletrônica
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Disponibilize espelhos consolidados para os funcionários assinarem digitalmente (Portaria 671 MTE / Lei 14.063/2020).
          </p>
        </div>

        {/* Seletores de Mês/Ano e Botão de Ação */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full sm:w-auto px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500"
          >
            {MESES.map((nome, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {nome}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full sm:w-auto px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm font-medium cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleLiberarFechamento}
            disabled={liberando}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer shrink-0"
          >
            {liberando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send size={16} />
                Liberar para Assinatura
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cards de Métricas em Tempo Real */}
      {dados && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total de Colaboradores
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {dados.stats.total}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Assinados
            </span>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {dados.stats.assinados}{" "}
              <span className="text-xs font-medium text-emerald-600/80">
                ({dados.stats.percentualAssinado}%)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20 space-y-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Clock size={14} /> Pendentes
            </span>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {dados.stats.pendentes}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/20 space-y-1">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle size={14} /> Contestados
            </span>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              {dados.stats.contestados}
            </div>
          </div>
        </div>
      )}

      {/* Barra de Progresso Geral */}
      {dados && dados.stats.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Progresso das Assinaturas Digitais</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {dados.stats.assinados} de {dados.stats.total} colaboradores ({dados.stats.percentualAssinado}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${dados.stats.percentualAssinado}%` }}
            />
          </div>
        </div>
      )}

      {/* Filtros e Tabela de Colaboradores */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar colaborador por nome ou e-mail..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-xs overflow-x-auto scrollbar-none w-full sm:w-auto">
            {(["TODOS", "LIBERADO", "ASSINADO", "CONTESTADO", "NAO_GERADO"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFiltroStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filtroStatus === st
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {st === "TODOS"
                  ? "Todos"
                  : st === "LIBERADO"
                  ? "Pendentes"
                  : st === "ASSINADO"
                  ? "Assinados"
                  : st === "CONTESTADO"
                  ? "Contestados"
                  : "Não Gerados"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={28} />
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/60 dark:border-white/5">
            Nenhum colaborador encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Status da Assinatura</th>
                    <th className="py-3 px-4">Horas Trabalhadas</th>
                    <th className="py-3 px-4">Horas Extras</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {itemsFiltrados.map((item) => (
                    <tr
                      key={item.userId}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.userName}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {item.userEmail}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.status === "ASSINADO" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                            <CheckCircle2 size={12} />
                            Assinado {item.assinadoEm ? `em ${new Date(item.assinadoEm).toLocaleDateString("pt-BR")}` : ""}
                          </span>
                        )}
                        {item.status === "LIBERADO" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                            <Clock size={12} />
                            Aguardando Assinatura
                          </span>
                        )}
                        {item.status === "CONTESTADO" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold text-[11px]">
                            <AlertCircle size={12} />
                            Contestado pelo Funcionário
                          </span>
                        )}
                        {item.status === "NAO_GERADO" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            Não Liberado
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {item.resumoHoras?.horasTrabalhadasFormatadas || "--:--"}
                      </td>

                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {item.resumoHoras?.horasExtrasFormatadas !== "00:00" && item.resumoHoras?.horasExtrasFormatadas
                          ? item.resumoHoras.horasExtrasFormatadas
                          : "-"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status === "CONTESTADO" && item.motivoRecusa && (
                            <button
                              onClick={() => setModalContestacaoItem(item)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1 hover:bg-rose-100 transition-colors"
                            >
                              <MessageSquareWarning size={13} />
                              Ver Motivo
                            </button>
                          )}

                          {item.hasEspelho && item.id && (
                            <button
                              onClick={() => handleDownloadPdf(item.id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Download size={13} />
                              PDF
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PARA VER MOTIVO DA CONTESTAÇÃO */}
      {modalContestacaoItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <MessageSquareWarning size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Motivo da Contestação
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {modalContestacaoItem.userName}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              "{modalContestacaoItem.motivoRecusa}"
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalContestacaoItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
