import { useState, useRef } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { api } from "../../services/api";
import { useToast } from "../../hooks/useToast";

interface ParsedEmployeeRow {
  id: number;
  name: string;
  email: string;
  role: "EMPLOYEE" | "ENTERPRISE_ADMIN";
  isValid: boolean;
  validationError?: string;
}

export function BulkImportTab({ onImportComplete }: { onImportComplete?: () => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedEmployeeRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Result state
  const [importResult, setImportResult] = useState<{
    totalProcessed: number;
    createdCount: number;
    errorCount: number;
    createdEmployees: { id: string; name: string; email: string; role: string; temporaryPassword: string }[];
    errors: { name: string; email: string; reason: string }[];
  } | null>(null);

  // Download do modelo CSV
  const handleDownloadTemplate = () => {
    const csvContent =
      "nome,email,cargo\n" +
      "Carlos Eduardo Silva,carlos@suaempresa.com.br,funcionario\n" +
      "Juliana Costa,juliana@suaempresa.com.br,funcionario\n" +
      "Marcos Santos,marcos@suaempresa.com.br,admin\n";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo_importacao_colaboradores_viggo.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo baixado! Preencha e faça o upload abaixo.");
  };

  // Parse do arquivo CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r\n|\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        toast.error("O arquivo CSV está vazio ou contém apenas o cabeçalho.");
        return;
      }

      // Detect separator: ; or ,
      const header = lines[0];
      const separator = header.includes(";") ? ";" : ",";

      const parsed: ParsedEmployeeRow[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const seenEmails = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const name = columns[0] || "";
        const email = (columns[1] || "").toLowerCase();
        const roleRaw = (columns[2] || "").toLowerCase();

        const role = roleRaw.includes("admin") ? "ENTERPRISE_ADMIN" : "EMPLOYEE";

        let isValid = true;
        let validationError: string | undefined = undefined;

        if (!name || name.length < 2) {
          isValid = false;
          validationError = "Nome muito curto ou vazio";
        } else if (!email || !emailRegex.test(email)) {
          isValid = false;
          validationError = "E-mail inválido";
        } else if (seenEmails.has(email)) {
          isValid = false;
          validationError = "E-mail duplicado no arquivo";
        } else {
          seenEmails.add(email);
        }

        parsed.push({
          id: i,
          name,
          email,
          role,
          isValid,
          validationError,
        });
      }

      setRows(parsed);
    };

    reader.readAsText(file, "UTF-8");
  };

  const handleStartImport = async () => {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("Não há colaboradores válidos para importar.");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await api.employees.bulkImport(
        validRows.map((r) => ({
          name: r.name,
          email: r.email,
          role: r.role,
        }))
      );

      setImportResult({
        totalProcessed: response.totalProcessed,
        createdCount: response.createdCount,
        errorCount: response.errorCount,
        createdEmployees: response.createdEmployees,
        errors: response.errors,
      });

      toast.success(`Importação concluída: ${response.createdCount} colaboradores criados!`);
      onImportComplete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar importação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportAccessReport = () => {
    if (!importResult || importResult.createdEmployees.length === 0) return;

    let csv = "nome,email,cargo,senha_provisoria\n";
    importResult.createdEmployees.forEach((emp) => {
      csv += `"${emp.name}","${emp.email}","${emp.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionario"}","${emp.temporaryPassword}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_acessos_viggo_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório de credenciais baixado com sucesso!");
  };

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;

  if (importResult) {
    return (
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6 transition-colors animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Importação Concluída com Sucesso!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {importResult.createdCount} colaboradores foram cadastrados no sistema
            </p>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Processados</span>
            <span className="text-xl font-bold text-slate-800 dark:text-white">{importResult.totalProcessed}</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">Criados</span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{importResult.createdCount}</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block mb-1">Falhas / Duplicados</span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{importResult.errorCount}</span>
          </div>
        </div>

        {/* Falhas detalhadas caso existam */}
        {importResult.errors.length > 0 && (
          <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle size={15} />
              <span>Itens não importados:</span>
            </div>
            <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-1">
              {importResult.errors.map((err, i) => (
                <li key={i}>
                  <strong>{err.name}</strong> ({err.email}): {err.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botão para Baixar Relatório com Senhas */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportAccessReport}
            className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-sm"
          >
            <Download size={16} />
            Baixar Relatório de Acessos com Senhas Provisórias (.csv)
          </button>

          <button
            type="button"
            onClick={() => {
              setImportResult(null);
              setRows([]);
              setFileName(null);
            }}
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors text-sm cursor-pointer"
          >
            Importar Outro Arquivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Importação em Massa via Planilha (CSV)
            </h2>
            <p className="text-xs text-slate-400">
              Cadastre múltiplos funcionários de uma só vez fazendo upload de um arquivo CSV
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl transition-colors text-xs font-semibold cursor-pointer shrink-0"
        >
          <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>Baixar Modelo (.csv)</span>
        </button>
      </div>

      {/* Upload Zone */}
      {rows.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-white/[0.01] hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload size={28} />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-base mb-1">
            Selecione ou Arraste o arquivo CSV aqui
          </h3>
          <p className="text-xs text-slate-400">
            O arquivo deve conter as colunas: <strong>nome, email, cargo</strong> (use nosso modelo para garantir a formatação correta).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{fileName}</p>
                <p className="text-xs text-slate-400">
                  {validCount} válido(s) {invalidCount > 0 && `• ${invalidCount} inválido(s)`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRows([]);
                setFileName(null);
              }}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Trash2 size={14} />
              Remover arquivo
            </button>
          </div>

          {/* Pré-visualização da Tabela */}
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/10 max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#18181b] border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider z-10">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">E-mail</th>
                  <th className="p-3">Cargo</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-slate-600 dark:text-slate-300">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.isValid
                        ? "hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                        : "bg-red-50/40 dark:bg-red-950/20"
                    }
                  >
                    <td className="p-3 text-slate-400">{row.id}</td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-white">{row.name}</td>
                    <td className="p-3">{row.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          row.role === "ENTERPRISE_ADMIN"
                            ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                            : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {row.role === "ENTERPRISE_ADMIN" ? "Admin" : "Funcionário"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {row.isValid ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          Pronto
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold inline-flex items-center gap-1" title={row.validationError}>
                          <AlertTriangle size={13} />
                          {row.validationError}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleStartImport}
            disabled={isProcessing || validCount === 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processando Importação ({validCount} colaboradores)...
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                Importar {validCount} Colaboradores Válidos
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
