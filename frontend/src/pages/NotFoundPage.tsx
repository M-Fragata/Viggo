import { useNavigate } from "react-router";
import { Button } from "../components/Button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center w-dvw h-dvh gap-6">
      <h1 className="text-7xl font-black text-emerald-500">404</h1>
      <p className="text-2xl font-bold text-emerald-500">Not Found</p>
      <Button
        title="Voltar ao Início"
        onClick={() => navigate("/")}
        className="mt-4 bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] uppercase tracking-widest text-xs cursor-pointer"
      />
    </div>
  );
}
