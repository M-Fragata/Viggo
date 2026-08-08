import { useState, useEffect } from "react";
import { X, CheckSquare, Square, Check } from "lucide-react";
import { api, type WorkScheduleResponse, type EmployeeListItem } from "../../services/api";

interface AssignScheduleModalProps {
  schedule: WorkScheduleResponse;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignScheduleModal({ schedule, onClose, onAssigned }: AssignScheduleModalProps) {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const data = await api.employees.list(today);
        setEmployees(data);
        const alreadyAssigned = new Set(data.filter((e) => e.workScheduleId === schedule.id).map((e) => e.id));
        setSelectedIds(alreadyAssigned);
      } catch {
        setEmployees([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [schedule.id]);

  function toggleAll() {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e.id)));
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAssign() {
    try {
      setIsSaving(true);
      for (const id of selectedIds) {
        await api.workSchedules.assignToEmployee(id, schedule.id);
      }
      onAssigned();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atribuir horários");
    } finally {
      setIsSaving(false);
    }
  }

  const allSelected = employees.length > 0 && selectedIds.size === employees.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Atribuir: {schedule.name}</h2>
            <p className="text-sm text-slate-500">
              {schedule._count.users} funcionário(s) vinculado(s)
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="px-6 pt-4 space-y-2">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            {allSelected ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            disabled={noneSelected}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={18} />
            Limpar tudo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhum funcionário cadastrado</div>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => {
                const isSelected = selectedIds.has(emp.id);
                const isAlreadyAssigned = emp.workScheduleId === schedule.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => toggle(emp.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-colors ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare size={18} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Square size={18} className="text-slate-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-800 block truncate">{emp.name}</span>
                      <span className="text-xs text-slate-500">
                        {emp.workScheduleId ? (
                          isAlreadyAssigned ? (
                            <span className="text-emerald-600">Este horário</span>
                          ) : (
                            <span>Horário atribuído</span>
                          )
                        ) : (
                          <span className="text-slate-400">Sem horário</span>
                        )}
                      </span>
                    </div>
                    {isAlreadyAssigned && (
                      <Check size={16} className="text-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={isSaving}
            className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
