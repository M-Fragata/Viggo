import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  ShieldCheck,
  Loader2,
  Lock,
  MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";
import { api, type MeuEspelhoItem, type EspelhoPontoDetalheResponse } from "../services/api";
import { PageHeader } from "../components/common/PageHeader";
import { MeusEspelhosSkeleton } from "../components/espelhos/MeusEspelhosSkeleton";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function MeusEspelhosPage() {
  const [espelhos, setEspelhos] = useState<MeuEspelhoItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [espelhoDetalhe, setEspelhoDetalhe] = useState<EspelhoPontoDetalheResponse | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Modal Assinatura
  const [modalAssinarOpen, setModalAssinarOpen] = useState(false);
  const [senhaAssinatura, setSenhaAssinatura] = useState("");
  const [assinando, setAssinando] = useState(false);

  // Modal Contestação
  const [modalContestarOpen, setModalContestarOpen] = useState(false);
  const [motivoContestacao, setMotivoContestacao] = useState("");
  const [contestando, setContestando] = useState(false);

  async function carregarEspelhos() {
    try {
      setLoadingList(true);
      const data = await api.espelhos.listarMeus();
      setEspelhos(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao carregar seus espelhos de ponto.";
      toast.error(errorMsg);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    api.espelhos
      .listarMeus()
      .then((data) => {
        if (ativo) {
          setEspelhos(data);
          setSelectedId((prev) => prev || (data.length > 0 && data[0]?.id ? data[0].id : null));
        }
      })
      .catch((err: unknown) => {
        if (ativo) {
          const errorMsg = err instanceof Error ? err.message : "Erro ao carregar seus espelhos de ponto.";
          toast.error(errorMsg);
        }
      })
      .finally(() => {
        if (ativo) setLoadingList(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  async function carregarDetalhes(id: string) {
    try {
      setLoadingDetalhe(true);
      const detalhe = await api.espelhos.obterDetalhes(id);
      setEspelhoDetalhe(detalhe);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao carregar detalhes do espelho.";
      toast.error(errorMsg);
    } finally {
      setLoadingDetalhe(false);
    }
  }

  useEffect(() => {
    if (!selectedId) return;
    const idAtual = selectedId;
    let ativo = true;

    async function buscarDetalhes() {
      try {
        const detalhe = await api.espelhos.obterDetalhes(idAtual!);
        if (ativo) setEspelhoDetalhe(detalhe);
      } catch (err: unknown) {
        if (ativo) {
          const errorMsg = err instanceof Error ? err.message : "Erro ao carregar detalhes do espelho.";
          toast.error(errorMsg);
        }
      } finally {
        if (ativo) setLoadingDetalhe(false);
      }
    }

    void buscarDetalhes();

    return () => {
      ativo = false;
    };
  }, [selectedId]);

  async function handleConfirmarAssinatura() {
    if (!selectedId || !senhaAssinatura.trim()) {
      toast.error("Informe sua senha para confirmar a assinatura eletrônica.");
      return;
    }

    try {
      setAssinando(true);
      const res = await api.espelhos.assinar(selectedId, senhaAssinatura);
      toast.success(res.message || "Espelho assinado eletronicamente com sucesso!");
      setModalAssinarOpen(false);
      setSenhaAssinatura("");
      await carregarEspelhos();
      await carregarDetalhes(selectedId);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Falha ao assinar espelho de ponto.";
      toast.error(errorMsg);
    } finally {
      setAssinando(false);
    }
  }

  async function handleConfirmarContestacao() {
    if (!selectedId || motivoContestacao.trim().length < 5) {
      toast.error("Descreva detalhadamente a divergência (mínimo de 5 caracteres).");
      return;
    }

    try {
      setContestando(true);
      const res = await api.espelhos.contestar(selectedId, motivoContestacao);
      toast.success(res.message || "Contestação enviada ao RH com sucesso!");
      setModalContestarOpen(false);
      setMotivoContestacao("");
      await carregarEspelhos();
      await carregarDetalhes(selectedId);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Falha ao enviar contestação.";
      toast.error(errorMsg);
    } finally {
      setContestando(false);
    }
  }

  function handleDownloadPdf() {
    if (!selectedId) return;
    const url = api.espelhos.downloadPdfUrl(selectedId);
    window.open(url, "_blank");
  }

  if (loadingList) {
    return <MeusEspelhosSkeleton />;
  }

  return (
    <div className="w-full space-y-6 min-w-0">
      <PageHeader
        title="Meus Espelhos de Ponto"
        subtitle="Conferência mensal, histórico e assinatura eletrônica avançada (Portaria 671/2021 MTE e Lei 14.063/2020)"
        helpText="Nesta página você pode revisar dia a dia os registros do seu ponto mensal, atestar a conformidade das suas horas trabalhadas e assinar digitalmente seu espelho sem necessidade de papel."
      />

      {espelhos.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-500 flex items-center justify-center mx-auto">
            <Clock size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Nenhum espelho liberado no momento
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            O departamento de Recursos Humanos da sua empresa ainda não liberou espelhos de ponto para assinatura. Assim que liberado, ele aparecerá aqui para sua conferência.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna Esquerda: Seletor de Meses */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              Meses Disponíveis
            </h3>
            <div className="space-y-2">
              {espelhos.map((item) => {
                const isSelected = item.id === selectedId;
                const mesNome = MESES[item.mes - 1] || `Mês ${item.mes}`;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                      isSelected
                        ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/50 shadow-sm"
                        : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {mesNome}/{item.ano}
                      </span>
                      {item.status === "ASSINADO" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 size={12} /> Assinado
                        </span>
                      )}
                      {item.status === "LIBERADO" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                          <Clock size={12} /> Pendente
                        </span>
                      )}
                      {item.status === "CONTESTADO" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                          <AlertCircle size={12} /> Em Revisão
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Horas: {item.resumoHoras?.horasTrabalhadasFormatadas || "--:--"}</span>
                      <span>Extras: {item.resumoHoras?.horasExtrasFormatadas || "00:00"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Detalhamento do Espelho Selecionado */}
          <div className="lg:col-span-3 space-y-6">
            {loadingDetalhe ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-16 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
              </div>
            ) : espelhoDetalhe ? (
              <>
                {/* Banner de Status & Ações */}
                <div
                  className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    espelhoDetalhe.status === "ASSINADO"
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30"
                      : espelhoDetalhe.status === "CONTESTADO"
                      ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-500/30"
                      : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-500/30"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {espelhoDetalhe.status === "ASSINADO" && (
                        <>
                          <CheckCircle2 className="text-emerald-500" size={20} />
                          <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-base">
                            Espelho Assinado Eletronicamente
                          </h4>
                        </>
                      )}
                      {espelhoDetalhe.status === "LIBERADO" && (
                        <>
                          <Clock className="text-amber-500" size={20} />
                          <h4 className="font-bold text-amber-900 dark:text-amber-300 text-base">
                            Aguardando sua Assinatura Eletrônica
                          </h4>
                        </>
                      )}
                      {espelhoDetalhe.status === "CONTESTADO" && (
                        <>
                          <AlertCircle className="text-rose-500" size={20} />
                          <h4 className="font-bold text-rose-900 dark:text-rose-300 text-base">
                            Contestação Enviada ao RH
                          </h4>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {espelhoDetalhe.status === "ASSINADO"
                        ? `Assinado em ${new Date(espelhoDetalhe.assinadoEm!).toLocaleDateString("pt-BR")} às ${new Date(espelhoDetalhe.assinadoEm!).toLocaleTimeString("pt-BR")} (IP: ${espelhoDetalhe.ipAssinatura})`
                        : espelhoDetalhe.status === "CONTESTADO"
                        ? `Motivo: "${espelhoDetalhe.motivoRecusa}"`
                        : "Por favor, confira todos os dias e confirme a concordância com o espelho de ponto."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDownloadPdf}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Download size={14} />
                      Baixar PDF Oficial
                    </button>

                    {espelhoDetalhe.status === "LIBERADO" && (
                      <>
                        <button
                          onClick={() => setModalContestarOpen(true)}
                          className="px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-white dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors"
                        >
                          <MessageSquareWarning size={14} />
                          Contestar
                        </button>
                        <button
                          onClick={() => setModalAssinarOpen(true)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition-all"
                        >
                          <ShieldCheck size={16} />
                          Assinar Espelho
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tabela de Dias do Mês */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Detalhamento Diário — {MESES[espelhoDetalhe.mes - 1]}/{espelhoDetalhe.ano}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {espelhoDetalhe.detalhesDias.length} dias apurados conforme Portaria 671/2021 MTE
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Hash SHA-256: </span>
                      <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                        {espelhoDetalhe.hashDocumento.substring(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 font-semibold">
                          <th className="py-3 px-3">Dia</th>
                          <th className="py-3 px-3">Sem</th>
                          <th className="py-3 px-3">Entrada</th>
                          <th className="py-3 px-3">S. Almoço</th>
                          <th className="py-3 px-3">R. Almoço</th>
                          <th className="py-3 px-3">Saída</th>
                          <th className="py-3 px-3">Horas</th>
                          <th className="py-3 px-3">Extras</th>
                          <th className="py-3 px-3">Observações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {espelhoDetalhe.detalhesDias.map((d, index) => {
                          const isWeekend = d.diaSemana === "Sáb" || d.diaSemana === "Dom";

                          return (
                            <tr
                              key={index}
                              className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors ${
                                isWeekend ? "bg-slate-50/40 dark:bg-white/[0.01]" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                {d.diaNumero}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                {d.diaSemana}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {d.entrada}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {d.saidaAlmoco}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {d.retornoAlmoco}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {d.saida}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                                {d.horasTrabalhadas}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                {d.horasExtras !== "-" && d.horasExtras !== "00:00" ? d.horasExtras : "-"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                                {d.observacoes || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totalizadores no Rodapé */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Dias Trabalhados: </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {espelhoDetalhe.resumoHoras?.totalDiasTrabalhados || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Total Horas Trabalhadas: </span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {espelhoDetalhe.resumoHoras?.horasTrabalhadasFormatadas || "00:00"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Total Horas Extras: </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {espelhoDetalhe.resumoHoras?.horasExtrasFormatadas || "00:00"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      *T = Tolerância CLT (Art. 58 §1º) | *E = Horas Extras | *I = Intervalo &lt; 60min
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL DE ASSINATURA ELETRÔNICA */}
      {modalAssinarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Assinatura Eletrônica Avançada
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Portaria MTE nº 671/2021 e Lei Federal nº 14.063/2020
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
              <p>
                Declaro para os devidos fins legais que revisei integralmente os registros de horários,
                intervalos e horas apuradas no presente espelho de ponto referente ao período selecionado,
                estando de pleno acordo com os mesmos.
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-white/5">
                🔒 A assinatura registrará seu endereço IP, carimbo de data/hora UTC e gerará um hash de integridade inviolável SHA-256.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirme sua senha corporativa para assinar:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={senhaAssinatura}
                  onChange={(e) => setSenhaAssinatura(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalAssinarOpen(false);
                  setSenhaAssinatura("");
                }}
                disabled={assinando}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAssinatura}
                disabled={assinando || !senhaAssinatura.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition-all"
              >
                {assinando ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Assinando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Confirmar Assinatura Digital
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONTESTAÇÃO / SOLICITAÇÃO DE CORREÇÃO */}
      {modalContestarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <MessageSquareWarning size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Solicitar Correção ao RH
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aponte os dias e divergências que você identificou
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Descrição do motivo da divergência:
              </label>
              <textarea
                value={motivoContestacao}
                onChange={(e) => setMotivoContestacao(e.target.value)}
                rows={4}
                placeholder="Exemplo: No dia 14/01 trabalhei até as 18:00 mas esqueci de registrar a saída; ou anexei atestado do dia 08/01 que ainda consta como falta."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalContestarOpen(false);
                  setMotivoContestacao("");
                }}
                disabled={contestando}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarContestacao}
                disabled={contestando || motivoContestacao.trim().length < 5}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-rose-600/30 transition-all"
              >
                {contestando ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar para o RH"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
