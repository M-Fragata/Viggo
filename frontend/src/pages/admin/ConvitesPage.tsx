import { useState } from "react";
import { Link2, UserPlus, FileSpreadsheet } from "lucide-react";
import { InvitesTab } from "../../components/company/InvitesTab";
import { ManualEmployeeForm } from "../../components/company/ManualEmployeeForm";
import { BulkImportTab } from "../../components/company/BulkImportTab";
import { PageHeader } from "../../components/common/PageHeader";

type AdmissionTab = "link" | "manual" | "csv";

export function ConvitesPage() {
  const [activeTab, setActiveTab] = useState<AdmissionTab>("link");

  return (
    <div className="w-full space-y-6 min-w-0">
      <PageHeader
        title="Admissão de Colaboradores"
        subtitle="Convites com QR Code, cadastro individual ou importação em lote via planilha"
        helpText="Escolha como deseja adicionar membros à equipe: compartilhando um link de auto-cadastro com biometria facial, cadastrando manualmente 1 a 1 com senha provisória, ou importando uma planilha CSV com vários colaboradores."
      />

      {/* Seletor de Abas Moderno */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-xs flex flex-col sm:flex-row gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("link")}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-1 ${
            activeTab === "link"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
          }`}
        >
          <Link2 size={16} />
          <span>Links de Convite</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-1 ${
            activeTab === "manual"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
          }`}
        >
          <UserPlus size={16} />
          <span>Cadastro Manual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("csv")}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-1 ${
            activeTab === "csv"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Importar Planilha (CSV)</span>
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === "link" && <InvitesTab />}
      {activeTab === "manual" && <ManualEmployeeForm />}
      {activeTab === "csv" && <BulkImportTab />}
    </div>
  );
}
