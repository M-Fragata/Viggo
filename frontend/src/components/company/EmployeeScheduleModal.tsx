import { useState, useEffect, useCallback } from "react";
import { X, Clock, Plus, Trash2 } from "lucide-react";
import { api, type WorkScheduleResponse } from "../../services/api";

interface EmployeeScheduleModalProps {
  employeeId: string;
  employeeName: string;
  currentScheduleId: string | null;
  schedules: WorkScheduleResponse[];
  onClose: () => void;
  onAssigned: () => void;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatDays(days: number): string {
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const bits = [1, 2, 4, 8, 16, 32, 64];
  return bits.map((b, i) => (days & b) ? labels[i] : null).filter(Boolean).join(", ");
}

export function EmployeeScheduleModal({
  employeeId,
  employeeName,
  currentScheduleId,
  schedules: initialSchedules,
  onClose,
  onAssigned,
}: EmployeeScheduleModalProps) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [selectedId, setSelectedId] = useState<string | null>(currentScheduleId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    entryTime: 480,
    lunchStart: 720,
    lunchEnd: 780,
    exitTime: 1020,
    daysOfWeek: 31,
    checkinToleranceMinutes: 5,
    lunchToleranceMinutes: 15,
  });

  const currentSchedule = schedules.find((s) => s.id === currentScheduleId);

  const refreshSchedules = useCallback(async () => {
    try {
      const data = await api.workSchedules.list();
      setSchedules(data);
    } catch {
      // mantém a lista atual
    }
  }, []);

  useEffect(() => {
    refreshSchedules();
  }, [refreshSchedules]);

  function resetForm() {
    setForm({
      name: "",
      entryTime: 480,
      lunchStart: 720,
      lunchEnd: 780,
      exitTime: 1020,
      daysOfWeek: 31,
      checkinToleranceMinutes: 5,
      lunchToleranceMinutes: 15,
    });
  }

  function toggleDay(bit: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek & bit ? prev.daysOfWeek & ~bit : prev.daysOfWeek | bit,
    }));
  }

  async function handleCreateSchedule() {
    try {
      const newSchedule = await api.workSchedules.create(form);
      setSchedules((prev) => [...prev, newSchedule]);
      setSelectedId(newSchedule.id);
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao criar horário");
    }
  }

  async function handleAssign() {
    if (selectedId === currentScheduleId) {
      onClose();
      return;
    }
    try {
      setIsSaving(true);
      await api.workSchedules.assignToEmployee(employeeId, selectedId);
      onAssigned();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atribuir horário");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    try {
      setIsSaving(true);
      await api.workSchedules.assignToEmployee(employeeId, null);
      onAssigned();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao remover horário");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Horário de Trabalho</h2>
            <p className="text-sm text-slate-500">{employeeName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentSchedule && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Horário Atual</h3>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={16} className="text-emerald-600" />
                  <span className="font-bold text-emerald-800">{currentSchedule.name}</span>
                </div>
                <p className="text-sm text-emerald-700">
                  {formatMinutes(currentSchedule.entryTime)} – {formatMinutes(currentSchedule.exitTime)}
                </p>
                <p className="text-sm text-emerald-600">
                  Almoço: {formatMinutes(currentSchedule.lunchStart)} – {formatMinutes(currentSchedule.lunchEnd)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {formatDays(currentSchedule.daysOfWeek)} | Tolerância: {currentSchedule.checkinToleranceMinutes}min (ponto) / {currentSchedule.lunchToleranceMinutes}min (almoço)
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trocar para</h3>
            <div className="space-y-2">
              {schedules.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedId === s.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="schedule"
                    checked={selectedId === s.id}
                    onChange={() => setSelectedId(s.id)}
                    className="accent-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 block truncate">{s.name}</span>
                    <span className="text-xs text-slate-500">
                      {formatMinutes(s.entryTime)} – {formatMinutes(s.exitTime)} | {formatDays(s.daysOfWeek)}
                    </span>
                  </div>
                </label>
              ))}

              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 w-full p-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">Criar novo horário</span>
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Novo Horário</h4>
                <button onClick={() => { setShowCreateForm(false); resetForm(); }} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                  Cancelar
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Horário Comercial"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Entrada</label>
                  <input
                    type="time"
                    value={formatMinutes(form.entryTime)}
                    onChange={(e) => setForm({ ...form, entryTime: parseTimeToMinutes(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Saída</label>
                  <input
                    type="time"
                    value={formatMinutes(form.exitTime)}
                    onChange={(e) => setForm({ ...form, exitTime: parseTimeToMinutes(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Início Almoço</label>
                  <input
                    type="time"
                    value={formatMinutes(form.lunchStart)}
                    onChange={(e) => setForm({ ...form, lunchStart: parseTimeToMinutes(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Fim Almoço</label>
                  <input
                    type="time"
                    value={formatMinutes(form.lunchEnd)}
                    onChange={(e) => setForm({ ...form, lunchEnd: parseTimeToMinutes(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tolerância Ponto (min)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.checkinToleranceMinutes}
                  onChange={(e) => setForm({ ...form, checkinToleranceMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tolerância Almoço (min)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.lunchToleranceMinutes}
                  onChange={(e) => setForm({ ...form, lunchToleranceMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Dias da Semana</label>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 4, 8, 16, 32, 64].map((bit, i) => (
                    <button
                      key={bit}
                      type="button"
                      onClick={() => toggleDay(bit)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        form.daysOfWeek & bit ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateSchedule}
                disabled={!form.name.trim()}
                className="w-full px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar e Selecionar
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 pt-4 border-t border-slate-100">
          {currentScheduleId ? (
            <button
              onClick={handleRemove}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Remover
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleAssign}
            disabled={isSaving || selectedId === currentScheduleId}
            className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Salvando..." : "Atribuir"}
          </button>
        </div>
      </div>
    </div>
  );
}
