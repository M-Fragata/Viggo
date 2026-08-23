import { useState } from "react";
import type { FormattedCheckin } from "../../hooks/useCheckins";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";

interface CheckinTableProps {
  data: FormattedCheckin[];
  isLoading?: boolean;
}

export function CheckinTable({ data, isLoading = false }: CheckinTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <CheckinTableSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 dark:text-slate-500">
        Nenhum check-in registrado nesta data
      </div>
    );
  }

  return (
    <>
      {/* Mobile Accordion */}
      <div className="sm:hidden space-y-3">
        {data.map((checkin) => {
          const isExpanded = expandedId === checkin.employeeId;
          return (
            <div key={checkin.employeeId} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
              <div
                onClick={() => setExpandedId(isExpanded ? null : checkin.employeeId)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold text-slate-800 dark:text-white">{checkin.employeeName}</span>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/10 pt-3 space-y-3">
                  <CheckinField label="Entrada" entry={checkin.entrada} />
                  <CheckinField label="Almoço" entry={checkin.almoco} />
                  <CheckinField label="Retorno" entry={checkin.retorno} />
                  <CheckinField label="Saída" entry={checkin.saida} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="p-4 w-[30%] min-w-[180px]">Funcionário</th>
              <th className="p-4 w-[17.5%] min-w-[120px]">Entrada</th>
              <th className="p-4 w-[17.5%] min-w-[120px]">Almoço</th>
              <th className="p-4 w-[17.5%] min-w-[120px]">Retorno</th>
              <th className="p-4 w-[17.5%] min-w-[120px]">Saída</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-sm text-slate-600 dark:text-slate-300">
            {data.map((checkin) => (
              <tr key={checkin.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-semibold text-slate-800 dark:text-white">{checkin.employeeName}</td>
                <td className="p-4">
                  {checkin.entrada ? (
                    <div className="flex items-center gap-1">
                      <span>{formatTime(checkin.entrada.timestamp)}</span>
                      {checkin.entrada.lat && checkin.entrada.lng && (
                        <a
                          href={getGoogleMapsUrl(checkin.entrada.lat, checkin.entrada.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors"
                          aria-label="Ver localização no Google Maps"
                        >
                          <MapPin className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    "--"
                  )}
                </td>
                <td className="p-4">
                  {checkin.almoco ? (
                    <div className="flex items-center gap-1">
                      <span>{formatTime(checkin.almoco.timestamp)}</span>
                      {checkin.almoco.lat && checkin.almoco.lng && (
                        <a
                          href={getGoogleMapsUrl(checkin.almoco.lat, checkin.almoco.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors"
                          aria-label="Ver localização no Google Maps"
                        >
                          <MapPin className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    "--"
                  )}
                </td>
                <td className="p-4">
                  {checkin.retorno ? (
                    <div className="flex items-center gap-1">
                      <span>{formatTime(checkin.retorno.timestamp)}</span>
                      {checkin.retorno.lat && checkin.retorno.lng && (
                        <a
                          href={getGoogleMapsUrl(checkin.retorno.lat, checkin.retorno.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors"
                          aria-label="Ver localização no Google Maps"
                        >
                          <MapPin className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    "--"
                  )}
                </td>
                <td className="p-4">
                  {checkin.saida ? (
                    <div className="flex items-center gap-1">
                      <span>{formatTime(checkin.saida.timestamp)}</span>
                      {checkin.saida.lat && checkin.saida.lng && (
                        <a
                          href={getGoogleMapsUrl(checkin.saida.lat, checkin.saida.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors"
                          aria-label="Ver localização no Google Maps"
                        >
                          <MapPin className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    "--"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CheckinField({ label, entry }: { label: string; entry?: { timestamp: string; lat: number | null; lng: number | null } }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20">{label}</span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 text-center">{entry ? formatTime(entry.timestamp) : "--"}</span>
      {entry?.lat && entry?.lng ? (
        <a
          href={getGoogleMapsUrl(entry.lat, entry.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors w-6 flex justify-end"
          aria-label={`Ver localização de ${label} no Google Maps`}
        >
          <MapPin className="w-4 h-4" />
        </a>
      ) : (
        <span className="w-6" />
      )}
    </div>
  );
}

function CheckinTableSkeleton() {
  return (
    <>
      <div className="sm:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="h-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse w-1/2" />
              <div className="h-5 w-5 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="p-4 w-[30%] min-w-[180px]">Funcionário</th>
              <th className="p-4 w-[17.5%] min-w-[120px]">Entrada</th>
              <th className="p-4 w-[17.5%] min-w-[120px]">Almoço</th>
              <th className="p-4 w-[17.5%] min-w-[120px]">Retorno</th>
              <th className="p-4 w-[17.5%] min-w-[120px]">Saída</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse w-3/4" />
                </td>
                <td className="p-4">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse w-1/2" />
                </td>
                <td className="p-4">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse w-1/2" />
                </td>
                <td className="p-4">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse w-1/2" />
                </td>
                <td className="p-4">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse w-1/2" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}