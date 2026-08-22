import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api";
import type { WorkScheduleResponse } from "../../services/api";
import { AssignScheduleModal } from "../../components/company/AssignScheduleModal";
import { DashboardPageHeader } from "../../components/admin/DashboardPageHeader";
import { formatMinutes, parseTimeToMinutes, formatDays } from "../../utils/schedule";

export function HorariosPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardPageHeader />
      <WorkScheduleManager />
    </div>
  );
}

function WorkScheduleManager() {
  const [schedules, setSchedules] = useState<WorkScheduleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignModalSchedule, setAssignModalSchedule] = useState<WorkScheduleResponse | null>(null);
  const [form, setForm] = useState({
    name: "",
    entryTime: 480,
    lunchStart: 720,
    lunchEnd: 780,
    exitTime: 1020,
    daysOfWeek: 31,
    jornadaTipo: "5x2" as "5x2" | "6x1" | "12x36",
    checkinToleranceMinutes: 5,
    lunchToleranceMinutes: 15,
  });

  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.workSchedules.list();
      setSchedules(data);
    } catch {
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  async function handleSave() {
    try {
      if (editingId) {
        await api.workSchedules.update(editingId, form);
      } else {
        await api.workSchedules.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchSchedules();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar horário");
    }
  }

  function resetForm() {
    setForm({ name: "", entryTime: 480, lunchStart: 720, lunchEnd: 780, exitTime: 1020, daysOfWeek: 31, jornadaTipo: "5x2" as "5x2" | "6x1" | "12x36", checkinToleranceMinutes: 5, lunchToleranceMinutes: 15 });
  }

  function handleJornadaChange(value: "5x2" | "6x1" | "12x36") {
    setForm((prev) => ({
      ...prev,
      jornadaTipo: value,
      daysOfWeek: value === "5x2" ? 31 : value === "6x1" ? 63 : prev.daysOfWeek,
    }));
  }

  function handleEdit(s: WorkScheduleResponse) {
    setForm({
      name: s.name,
      entryTime: s.entryTime,
      lunchStart: s.lunchStart,
      lunchEnd: s.lunchEnd,
      exitTime: s.exitTime,
      daysOfWeek: s.daysOfWeek,
      jornadaTipo: s.jornadaTipo,
      checkinToleranceMinutes: s.checkinToleranceMinutes,
      lunchToleranceMinutes: s.lunchToleranceMinutes,
    });
    setEditingId(s.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja remover este horário?")) return;
    try {
      await api.workSchedules.remove(id);
      fetchSchedules();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao remover horário");
    }
  }

  function toggleDay(bit: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek & bit ? prev.daysOfWeek & ~bit : prev.daysOfWeek | bit,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Horários de Trabalho</h2>
            <p className="text-slate-500 text-sm">Crie horários e atribua aos funcionários para aplicação de tolerância CLT</p>
          </div>
          <button
            onClick={() => { resetForm(); setEditingId(null); setShowForm(!showForm); }}
            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold text-sm cursor-pointer"
          >
            {showForm ? "Cancelar" : "+ Novo Horário"}
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 space-y-4">
            <h3 className="font-bold text-slate-800">{editingId ? "Editar Horário" : "Novo Horário"}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Horário Comercial"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Entrada</label>
                <input type="time" value={formatMinutes(form.entryTime)}
                  onChange={(e) => setForm({ ...form, entryTime: parseTimeToMinutes(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Saída</label>
                <input type="time" value={formatMinutes(form.exitTime)}
                  onChange={(e) => setForm({ ...form, exitTime: parseTimeToMinutes(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Início Almoço</label>
                <input type="time" value={formatMinutes(form.lunchStart)}
                  onChange={(e) => setForm({ ...form, lunchStart: parseTimeToMinutes(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Fim Almoço</label>
                <input type="time" value={formatMinutes(form.lunchEnd)}
                  onChange={(e) => setForm({ ...form, lunchEnd: parseTimeToMinutes(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Escala *</label>
                <select value={form.jornadaTipo} onChange={(e) => handleJornadaChange(e.target.value as "5x2" | "6x1" | "12x36")}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm">
                  <option value="5x2">5x2 — Seg a Sex (44h/sem)</option>
                  <option value="6x1">6x1 — Seg a Sáb (44h/sem, DSR rotativo)</option>
                  <option value="12x36">12x36 — 12h trabalha / 36h folga</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {form.jornadaTipo === "5x2" && "Folga fixa: Sáb e Dom"}
                  {form.jornadaTipo === "6x1" && "Máx 6 dias na semana Seg-Dom (7º vai p/ justificativa)"}
                  {form.jornadaTipo === "12x36" && "Máx 3-4 plantões por semana Seg-Dom"}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tolerância Ponto (min)</label>
                <input type="number" min={0} max={60} value={form.checkinToleranceMinutes}
                  onChange={(e) => setForm({ ...form, checkinToleranceMinutes: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tolerância Almoço (min)</label>
                <input type="number" min={0} max={120} value={form.lunchToleranceMinutes}
                  onChange={(e) => setForm({ ...form, lunchToleranceMinutes: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Dias da Semana</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 4, 8, 16, 32, 64].map((bit, i) => (
                  <button key={bit} type="button" onClick={() => toggleDay(bit)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      form.daysOfWeek & bit ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}>
                    {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}
                  </button>
                ))}
              </div>
              {form.jornadaTipo !== "12x36" && <p className="text-xs text-slate-400 mt-1">Auto-preenchido pela escala, mas editável</p>}
            </div>

            <button onClick={handleSave}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold text-sm cursor-pointer">
              {editingId ? "Salvar Alterações" : "Criar Horário"}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            Nenhum horário cadastrado. Clique em "+ Novo Horário" para criar.
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">{s.name}</h4>
                  <p className="text-sm text-slate-500">
                    {formatMinutes(s.entryTime)} – {formatMinutes(s.exitTime)} | Almoço: {formatMinutes(s.lunchStart)} – {formatMinutes(s.lunchEnd)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Dias: {formatDays(s.daysOfWeek)} | Tolerância: {s.checkinToleranceMinutes}min (ponto) / {s.lunchToleranceMinutes}min (almoço) |{" "}
                    <button
                      onClick={() => setAssignModalSchedule(s)}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline cursor-pointer"
                    >
                      {s._count.users} funcionário(s)
                    </button>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(s)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer">
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {assignModalSchedule && (
        <AssignScheduleModal
          schedule={assignModalSchedule}
          onClose={() => setAssignModalSchedule(null)}
          onAssigned={() => {
            fetchSchedules();
          }}
        />
      )}
    </div>
  );
}
