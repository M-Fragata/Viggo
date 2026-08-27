import { useNavigate } from "react-router";
import { Button } from "../components/Button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center w-dvw h-dvh gap-6 bg-slate-50 dark:bg-black transition-colors duration-200">
      <h1 className="text-7xl font-black text-brand-green">404</h1>
      <p className="text-2xl font-bold text-slate-800 dark:text-on-dark">Página não encontrada</p>
      <Button
        title="Voltar ao Início"
        onClick={() => navigate("/page")}
        className="mt-4 bg-brand-green hover:bg-brand-green-deep text-black font-bold py-3.5 px-8 rounded-full shadow-lg shadow-brand-green/20 transition-all active:scale-[0.98] uppercase tracking-wider text-xs cursor-pointer"
      />
    </div>
  );
}
