import { useState } from "react";
import { useCheckins } from "../../hooks/useCheckins";
import { CheckinTable } from "../../components/checkin/CheckinTable";
import { DashboardPageHeader } from "../../components/admin/DashboardPageHeader";

export function PresentesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const { checkins, isLoading } = useCheckins(selectedDate);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardPageHeader />

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">Presentes</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <CheckinTable data={checkins} isLoading={isLoading} />
      </div>
    </div>
  );
}
