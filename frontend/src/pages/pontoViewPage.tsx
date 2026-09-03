import { useState, useEffect, useMemo } from "react";

import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

import { Button } from "../components/Button";
import { PageHeader } from "../components/common/PageHeader";
import { PontoViewPageSkeleton } from "../components/PontoViewPageSkeleton";
import { Clock, MapPin, Calendar } from "lucide-react";

type Checkin = {
  id: string;
  createdAt: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
};

export function PontoViewPage() {
  const { token, company, user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [isLoadingCheckins, setIsLoadingCheckins] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!token) {
      window.location.assign("/");
      return;
    }
    api.checkins.list(date)
      .then((data) => {
        if (isMounted) {
          setCheckins(data);
          setIsLoadingCheckins(false);
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error("Erro ao buscar os pontos:", error);
          alert(error instanceof Error ? error.message : "Erro ao buscar os pontos. Tente novamente.");
          setIsLoadingCheckins(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [date, token]);

  const formatType = (type: string) => {
    const labels: Record<string, string> = {
      ENTRY: "Entrada",
      LUNCH_START: "Saída Almoço",
      LUNCH_END: "Retorno Almoço",
      EXIT: "Saída",
    };
    return labels[type] || type;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  const horasTrabalhadas = useMemo(() => {
    if (checkins.length < 2) return "0:00h";
    const index = checkins.length - 1;
    const initial = checkins[0].createdAt;
    const final = checkins[index].createdAt;
    const diff = new Date(final).getTime() - new Date(initial).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const h = String(hours).padStart(2, "0");
    const m = String(minutes).padStart(2, "0");
    return `${h}:${m}h`;
  }, [checkins]);

  async function handleGetComprovantes(pontos: Checkin[]) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const nome = user?.name ?? "Colaborador";
    const dataRelatorio = new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const tableRows = pontos
      .map(
        (ponto) => `
            <tr>
                <td>${escapeHtml(formatTime(ponto.createdAt))}</td>
                <td>${escapeHtml(formatType(ponto.type))}</td>
                <td style="font-size: 10px;">${
                  ponto.latitude != null && ponto.longitude != null
                    ? escapeHtml(ponto.latitude.toFixed(4)) + ", " + escapeHtml(ponto.longitude.toFixed(4))
                    : "Não informada (GPS negado)"
                }</td>
            </tr>
        `
      )
      .join("");

    printWindow.document.write(`
    <html>
        <head>
            <title>Frequencia ${dataRelatorio} - Ponto Fragata</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                .report-container { 
                    max-width: 600px; 
                    margin: auto; 
                    border: 1px solid #eee; 
                    padding: 30px;
                    border-radius: 8px;
                }
                .header { border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 25px; }
                .header h2 { margin: 0; color: #10b981; }
                .info-section { margin-bottom: 20px; display: flex; justify-content: space-between; font-size: 14px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { text-align: left; background: #f9f9f9; padding: 12px; border-bottom: 2px solid #eee; color: #666; font-size: 13px; }
                td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                
                .summary { margin-top: 30px; padding: 15px; background: #f0fdf4; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
                .summary b { color: #10b981; font-size: 18px; }
                
                .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; pt: 15px; }
                @media print { .report-container { border: none; } }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h2>Ponto Fragata</h2>
                    <p style="margin: 5px 0 0; color: #666;">Relatório de Frequência Individual</p>
                </div>
                
                <div class="info-section">
                    <div>
                        <p><b>Colaborador:</b> ${escapeHtml(nome)}</p>
                        <p><b>Data:</b> ${escapeHtml(dataRelatorio)}</p>
                    </div>
                    <div style="text-align: right">
                        <p><b>Empresa:</b> ${escapeHtml(company ?? "")}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Horário</th>
                            <th>Evento</th>
                            <th>Localização (Lat, Long)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>

                <div class="summary">
                    <span>Total de Horas Calculadas:</span>
                    <b>${escapeHtml(horasTrabalhadas)}</b>
                </div>

                <div class="footer">
                    <p>Documento gerado digitalmente em ${new Date().toLocaleString("pt-BR")}</p>
                    <p>Ponto Fragata - Maricá, RJ</p>
                </div>
            </div>
            <script>
                window.onload = () => {
                    window.print();
                    setTimeout(() => window.close(), 500);
                };
            </script>
        </body>
    </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="w-full space-y-6">
      {isLoadingCheckins ? (
        <PontoViewPageSkeleton />
      ) : (
        <>
          {/* Cabeçalho com Tooltip e Filtro de Data */}
          <PageHeader
            title="Histórico de Pontos"
            subtitle="Visualize seus registros diários e comprovantes digitais"
            helpText="Consulte todos os seus registros de ponto diários com horário oficial, comprovante digital assinado e localização."
            actions={
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 w-full sm:w-auto">
                <Calendar className="text-emerald-600 dark:text-emerald-400 shrink-0" size={18} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setIsLoadingCheckins(true);
                    setDate(e.target.value);
                  }}
                  className="bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200 text-sm font-medium w-full sm:w-auto cursor-pointer"
                />
              </div>
            }
          />

          {/* Conteúdo Principal */}
          <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna da Esquerda: Timeline de Pontos */}
            <div className="md:col-span-2 bg-white dark:bg-[#111113] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 transition-colors">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Clock size={18} className="text-emerald-600 dark:text-emerald-400" />
                Linha do tempo
              </h2>

              {checkins.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                  Nenhum ponto registrado nesta data.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-white/10 ml-4 pl-8 space-y-8">
                  {checkins.map((ponto) => (
                    <div key={ponto.id} className="relative">
                      {/* Bolinha da Timeline */}
                      <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-2 border-emerald-600 dark:border-emerald-400 bg-white dark:bg-[#111113]" />

                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-lg">
                            {formatTime(ponto.createdAt)}
                          </p>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">
                            {formatType(ponto.type)}
                          </p>
                        </div>
                        <div>
                          {ponto.latitude != null && ponto.longitude != null ? (
                            <a
                              className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              href={`https://www.google.com/maps/search/?api=1&query=${ponto.latitude},${ponto.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MapPin size={12} />
                              <Button
                                title="Ver no mapa"
                                className="hover:text-emerald-600 cursor-pointer text-xs"
                              />
                            </a>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400">Sem GPS</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                onClick={() => {
                  handleGetComprovantes(checkins);
                }}
                title="Gerar Comprovante"
                className="bg-emerald-600 hover:bg-emerald-700 text-white mt-10 w-full cursor-pointer py-3 px-4 rounded-xl font-bold transition-colors"
              />
            </div>

            {/* Coluna da Direita: Resumo/Cards Extras */}
            <div className="flex flex-col gap-6">
              <div className="bg-emerald-600 dark:bg-emerald-600/90 p-6 rounded-3xl text-white shadow-md shadow-emerald-900/10">
                <h3 className="text-emerald-100 text-sm font-medium mb-1">Total de Horas</h3>
                <p className="text-3xl font-bold">{horasTrabalhadas}</p>
                <div className="mt-4 pt-4 border-t border-emerald-500/60 text-xs text-emerald-100">
                  Cálculo baseado no primeiro e último registro.
                </div>
              </div>

              <div className="bg-white dark:bg-[#111113] p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
                <h3 className="text-slate-800 dark:text-white font-semibold mb-3 text-sm">Status do Dia</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    checkins.length === 4
                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40"
                      : "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40"
                  }`}
                >
                  {checkins && checkins.length === 4 ? "Completo" : "Incompleto"}
                </span>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}