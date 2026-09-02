import { Routes, Route, Navigate } from "react-router";
import { LayoutPage } from "../pages/layoutPage";
import { PontoPage } from "../pages/pontoPage";
import { PontoViewPage } from "../pages/pontoViewPage";
import { RegisterFace } from "../pages/RegisterFace";
import { MeusDadosPage } from "../pages/MeusDadosPage";
import { JustificativasPage } from "../pages/JustificativasPage";
import { MeusEspelhosPage } from "../pages/MeusEspelhosPage";
import { useAuth } from "../hooks/useAuth";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const LandingPage = lazyWithRetry(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const TermosDeUso = lazyWithRetry(() => import("../pages/TermosDeUso").then((m) => ({ default: m.TermosDeUso })));
const PoliticaPrivacidade = lazyWithRetry(() => import("../pages/PoliticaPrivacidade").then((m) => ({ default: m.PoliticaPrivacidade })));
const ConsentimentoBiometria = lazyWithRetry(() => import("../pages/ConsentimentoBiometria").then((m) => ({ default: m.ConsentimentoBiometria })));
const ContratoTratamentoDados = lazyWithRetry(() => import("../pages/ContratoTratamentoDados").then((m) => ({ default: m.ContratoTratamentoDados })));

export function UserRoutes() {
  const { user } = useAuth();

  if (user?.role !== "EMPLOYEE") return <Navigate to="/login" replace />;

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/page" element={<LandingPage />} />
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/consentimento-biometria" element={<ConsentimentoBiometria />} />
        <Route path="/contrato-de-tratamento-de-dados" element={<ContratoTratamentoDados />} />
        <Route path="/" element={<LayoutPage />}>
          <Route index element={<PontoPage />} />
          <Route path="ponto" element={<PontoPage />} />
          <Route path="pontos" element={<PontoViewPage />} />
          <Route path="register" element={<RegisterFace />} />
          <Route path="meus-dados" element={<MeusDadosPage />} />
          <Route path="justificativas" element={<JustificativasPage />} />
          <Route path="espelhos" element={<MeusEspelhosPage />} />
          <Route path="espelho" element={<MeusEspelhosPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}