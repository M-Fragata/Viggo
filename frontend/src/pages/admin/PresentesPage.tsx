import { useState } from "react";
import { useCheckins } from "../../hooks/useCheckins";
import { CheckinTable } from "../../components/checkin/CheckinTable";
import { PageHeader } from "../../components/common/PageHeader";

export function PresentesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const { checkins, isLoading } = useCheckins(selectedDate);

  return (
    <div className="w-full space-y-6 min-w-0">
      <PageHeader
        title="Quem está Presente"
        subtitle="Colaboradores que registraram ponto hoje"
        helpText="Lista em tempo real dos colaboradores que registraram entrada e estão em jornada de trabalho no momento."
      />

      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Presentes</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm"
          />
        </div>
        <CheckinTable data={checkins} isLoading={isLoading} />
      </div>
    </div>
  );
}
