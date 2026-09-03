import { useState, useEffect } from "react";
import { api } from "../../services/api";
import type { WorkLocationResponse, WorkLocationCreateBody } from "../../services/api";
import { PageHeader } from "../../components/common/PageHeader";
import { MapaPolosPicker } from "../../components/admin/MapaPolosPicker";
import { PolosTrabalhoSkeleton } from "../../components/admin/PolosTrabalhoSkeleton";
import {
  MapPin,
  Plus,
  Radio,
  CheckCircle2,
  Loader2,
  Trash2,
  Edit2,
  Info,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export function PolosTrabalhoPage() {
  const [polos, setPolos] = useState<WorkLocationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<WorkLocationCreateBody>({
    nome: "",
    endereco: "",
    latitude: -23.55052,
    longitude: -46.633308,
    raioMetros: 100,
  });

  async function carregarPolos() {
    try {
      setLoading(true);
      const data = await api.workLocations.list();
      setPolos(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar polos de trabalho.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    api.workLocations
      .list()
      .then((data) => {
        if (ativo) setPolos(data);
      })
      .catch((err: unknown) => {
        if (ativo) {
          toast.error(err instanceof Error ? err.message : "Erro ao carregar polos de trabalho.");
        }
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  function handleIniciarCriacao() {
    setEditandoId(null);
    setFormData({
      nome: "",
      endereco: "",
      latitude: -23.55052,
      longitude: -46.633308,
      raioMetros: 100,
    });
    setShowForm(true);
  }

  function handleIniciarEdicao(polo: WorkLocationResponse) {
    setEditandoId(polo.id);
    setFormData({
      nome: polo.nome,
      endereco: polo.endereco || "",
      latitude: polo.latitude,
      longitude: polo.longitude,
      raioMetros: polo.raioMetros,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("Informe o nome do polo de trabalho.");
      return;
    }

    try {
      setSalvando(true);
      if (editandoId) {
        const res = await api.workLocations.update(editandoId, formData);
        toast.success(res.message || "Polo atualizado com sucesso!");
      } else {
        const res = await api.workLocations.create(formData);
        toast.success(res.message || "Polo de trabalho cadastrado com sucesso!");
      }

      setShowForm(false);
      setEditandoId(null);
      await carregarPolos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar polo de trabalho.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleAtivo(polo: WorkLocationResponse) {
    try {
      await api.workLocations.update(polo.id, { ativo: !polo.ativo });
      toast.success(`Polo ${!polo.ativo ? "ativado" : "desativado"} com sucesso!`);
      await carregarPolos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar status do polo.");
    }
  }

  async function handleRemoverPolo(id: string) {
    if (!window.confirm("Deseja realmente remover este polo de trabalho?")) return;

    try {
      const res = await api.workLocations.remove(id);
      toast.success(res.message || "Polo removido com sucesso!");
      await carregarPolos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover polo de trabalho.");
    }
  }

  return (
    <div className="w-full space-y-6 min-w-0">
      <PageHeader
        title="Polos de Trabalho & Cercas Virtuais (Geofencing)"
        subtitle="Cadastre sedes, filiais e canteiros de obras para cálculo automático de menor distância e auditoria de pontos"
        helpText="Em conformidade com a Portaria 671/2021 MTE, as marcações fora do raio estipulado não são bloqueadas, mas recebem uma sinalização automática de distância para auditoria e controle do RH."
        actions={
          <button
            onClick={showForm ? () => setShowForm(false) : handleIniciarCriacao}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap shadow-sm shadow-emerald-600/30"
          >
            <Plus size={18} />
            {showForm ? "Fechar Formulário" : "Novo Polo de Trabalho"}
          </button>
        }
      />

      {/* CARD INFORMATIVO DE CONFORMIDADE LEGAL */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-4 flex items-start gap-3">
        <Info size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
          <span className="font-bold">Como funciona a auditoria por menor distância: </span>
          Sua empresa pode ter 1 ou múltiplos polos. Sempre que um colaborador registrar o ponto, o sistema calcula a distância até cada polo e vincula o registro ao polo mais próximo. Se o colaborador estiver fora do raio permitido, a marcação é gravada normalmente e o RH recebe o aviso com a distância exata em metros.
        </div>
      </div>

      {/* FORMULÁRIO COM MAPA INTERATIVO */}
      {showForm && (
        <section className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-5 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  {editandoId ? "Editar Polo de Trabalho" : "Cadastrar Novo Polo de Trabalho"}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina as coordenadas no mapa e o raio de tolerância aceitável em metros.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome do Polo / Filial *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                  required
                  placeholder="Ex: Sede Principal - Av. Paulista"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Endereço / Referência (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.endereco || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#18181b] text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* SELEÇÃO NO MAPA INTERATIVO */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Localização no Mapa & Círculo de Tolerância
              </label>
              <MapaPolosPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                raioMetros={formData.raioMetros || 100}
                onChangeCoordinates={(lat, lng, enderecoFormatado) => {
                  setFormData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    ...(enderecoFormatado && !prev.endereco ? { endereco: enderecoFormatado } : {}),
                  }));
                }}
              />
            </div>

            {/* CONFIGURAÇÃO DO RAIO EM METROS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Raio de Tolerância (Cerca Virtual)</span>
                  <span className="text-emerald-600 font-bold font-mono text-sm">
                    {formData.raioMetros} metros
                  </span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={2000}
                  step={10}
                  value={formData.raioMetros}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, raioMetros: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Valores típicos: 50m a 100m para escritórios fechados; 200m a 500m para obras e galpões.
                </p>
              </div>

              <div className="flex items-end justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={salvando}
                  className="px-5 py-2.5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm shadow-emerald-600/30"
                >
                  {salvando ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Polo de Trabalho"
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* LISTA DE POLOS CADASTRADOS */}
      {loading ? (
        <PolosTrabalhoSkeleton />
      ) : polos.length === 0 ? (
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center space-y-3">
          <Building2 className="mx-auto text-slate-300 dark:text-slate-600" size={48} />
          <h3 className="font-bold text-slate-800 dark:text-white text-base">Nenhum polo cadastrado</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Cadastre a sede ou filiais da sua empresa para que o sistema audite a distância geográfica de cada batida de ponto dos colaboradores.
          </p>
          <button
            onClick={handleIniciarCriacao}
            className="mt-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            Cadastrar Primeiro Polo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {polos.map((polo) => (
            <div
              key={polo.id}
              className={`bg-white dark:bg-[#111113] border rounded-2xl p-5 shadow-xs transition-all space-y-4 ${
                polo.ativo
                  ? "border-slate-200 dark:border-white/10"
                  : "border-slate-200/50 dark:border-white/5 opacity-60 bg-slate-50/50 dark:bg-white/[0.01]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      polo.ativo
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-white/5 text-slate-400"
                    }`}
                  >
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {polo.nome}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {polo.endereco || `${polo.latitude.toFixed(4)}, ${polo.longitude.toFixed(4)}`}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    polo.ativo
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-100 dark:bg-white/10 text-slate-500"
                  }`}
                >
                  {polo.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Raio de Tolerância
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Radio size={12} />
                    {polo.raioMetros} metros
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Batidas Vinculadas
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={12} className="text-slate-400" />
                    {polo._count?.checkIns ?? 0} registros
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                <button
                  onClick={() => handleToggleAtivo(polo)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer text-[11px]"
                >
                  {polo.ativo ? "Desativar" : "Reativar"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleIniciarEdicao(polo)}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Editar polo"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleRemoverPolo(polo.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Remover polo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
