import { Routes, Route, Navigate } from "react-router";
import { lazy } from "react";
import { LayoutPage } from "../pages/layoutPage";
import { PontoPage } from "../pages/pontoPage";
import { PontoViewPage } from "../pages/pontoViewPage";
import { RegisterFace } from "../pages/RegisterFace";
import { MeusDadosPage } from "../pages/MeusDadosPage";
import { useAuth } from "../hooks/useAuth";
import { NotFoundPage } from "../pages/NotFoundPage";

const LandingPage = lazy(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));

export function UserRoutes() {
  const { user } = useAuth();

  if (user?.role !== "EMPLOYEE") return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/page" element={<LandingPage />} />
      <Route path="/" element={<LayoutPage />}>
        <Route index element={<PontoPage />} />
        <Route path="ponto" element={<PontoPage />} />
        <Route path="pontos" element={<PontoViewPage />} />
        <Route path="register" element={<RegisterFace />} />
        <Route path="meus-dados" element={<MeusDadosPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}