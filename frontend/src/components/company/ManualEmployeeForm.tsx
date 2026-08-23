import { useState, useEffect } from "react";
import {
  UserPlus,
  Mail,
  User,
  Shield,
  Calendar,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api, type WorkScheduleResponse } from "../../services/api";
import { useToast } from "../../hooks/useToast";

function generateFriendlyPassword(name: string): string {
  const firstWord = name.trim().split(/\s+/)[0] || "usuario";
  const firstName = firstWord
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const base = firstName.length > 0 ? firstName : "usuario";
  const suffix = "@viggo";

  if (base.length + suffix.length < 8) {
    return `${base}123${suffix}`;
  }
  return `${base}${suffix}`;
}

export function ManualEmployeeForm({ onEmployeeCreated }: { onEmployeeCreated?: () => void }) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EMPLOYEE" | "ENTERPRISE_ADMIN">("EMPLOYEE");
  const [workScheduleId, setWorkScheduleId] = useState<string>("");
  const [schedules, setSchedules] = useState<WorkScheduleResponse[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Success state with created credentials
  const [createdData, setCreatedData] = useState<{
    name: string;
    email: string;
    role: string;
    temporaryPassword: string;
  } | null>(null);

  useEffect(() => {
    api.workSchedules.list().then(setSchedules).catch(() => setSchedules([]));
  }, []);

  const generatedPassword = generateFriendlyPassword(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Preencha o nome e o e-mail do colaborador.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.employees.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        workScheduleId: workScheduleId || null,
      });

      setCreatedData({
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        temporaryPassword: response.temporaryPassword,
      });

      toast.success("Colaborador cadastrado com sucesso!");
      onEmployeeCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar colaborador.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdData) return;
    const text = `👋 Olá, ${createdData.name}!\nSeu acesso ao sistema de ponto Viggo foi criado com sucesso.\n\n🔗 Link de Acesso: ${window.location.origin}/login\n📧 E-mail: ${createdData.email}\n🔑 Senha Provisória: ${createdData.temporaryPassword}\n\nNo primeiro acesso, o sistema solicitará a criação da sua senha definitiva.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Dados de acesso copiados para a área de transferência!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setRole("EMPLOYEE");
    setWorkScheduleId("");
    setCreatedData(null);
    setError(null);
  };

  if (createdData) {
    return (
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6 transition-colors animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Colaborador Cadastrado!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O usuário já pode acessar o sistema com as credenciais provisórias abaixo
            </p>
          </div>
        </div>

        {/* Box com Credenciais */}
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Credenciais de Primeiro Acesso
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
              Ativo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Nome:</span>
              <strong className="text-slate-800 dark:text-white text-sm">{createdData.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">E-mail:</span>
              <strong className="text-slate-800 dark:text-white text-sm">{createdData.email}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Cargo:</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                {createdData.role === "ENTERPRISE_ADMIN" ? "Administrador" : "Funcionário"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Senha Provisória:</span>
              <code className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded font-mono font-bold text-xs">
                {createdData.temporaryPassword}
              </code>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleCopyCredentials}
            className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-sm"
          >
            {copied ? (
              <>
                <Check size={16} />
                Copiado com Sucesso!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copiar Dados de Acesso
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors text-sm cursor-pointer"
          >
            Cadastrar Outro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6 transition-colors">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <UserPlus size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Cadastro Manual de Colaborador
          </h2>
          <p className="text-xs text-slate-400">
            Adicione membros da equipe individualmente com criação instantânea de acesso
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nome e E-mail */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Nome Completo *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Ex: Carlos Eduardo Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              E-mail Corporativo ou Pessoal *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="carlos@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Cargo e Escala */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Papel / Cargo
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "EMPLOYEE" | "ENTERPRISE_ADMIN")}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                <option value="EMPLOYEE" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Funcionário (Registra Ponto)</option>
                <option value="ENTERPRISE_ADMIN" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Administrador da Empresa</option>
              </select>
              <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Escala de Trabalho (Opcional)
            </label>
            <div className="relative">
              <select
                value={workScheduleId}
                onChange={(e) => setWorkScheduleId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Sem escala vinculada (definir depois)</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                    {s.name} ({s.jornadaTipo})
                  </option>
                ))}
              </select>
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Senha Temporária / Provisória: aparece somente ao digitar o nome */}
        {name.trim().length > 0 && (
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <KeyRound size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="text-slate-600 dark:text-slate-300">Senha provisória de primeiro acesso: </span>
                <code className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/50 rounded font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {generatedPassword}
                </code>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-400">
              O colaborador criará uma nova senha ao entrar.
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !name.trim() || !email.trim()}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Cadastrando Colaborador...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Criar Colaborador e Gerar Credenciais
            </>
          )}
        </button>
      </form>
    </div>
  );
}
