import { Routes, Route, Navigate } from "react-router";
import { MasterLayout } from "../components/master/MasterLayout";
import { MasterDashboard } from "../pages/MasterDashboard";
import { MasterCompanies } from "../pages/MasterCompanies";
import { MasterAuditLogs } from "../pages/MasterAuditLogs";
import { CompanyManagePage } from "../pages/CompanyManagePage";
import { MeusDadosPage } from "../pages/MeusDadosPage";
import { useAuth } from "../hooks/useAuth";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const LandingPage = lazyWithRetry(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const TermosDeUso = lazyWithRetry(() => import("../pages/TermosDeUso").then((m) => ({ default: m.TermosDeUso })));
const PoliticaPrivacidade = lazyWithRetry(() => import("../pages/PoliticaPrivacidade").then((m) => ({ default: m.PoliticaPrivacidade })));
const ConsentimentoBiometria = lazyWithRetry(() => import("../pages/ConsentimentoBiometria").then((m) => ({ default: m.ConsentimentoBiometria })));
const ContratoTratamentoDados = lazyWithRetry(() => import("../pages/ContratoTratamentoDados").then((m) => ({ default: m.ContratoTratamentoDados })));

export function MasterRoutes() {
  const { user } = useAuth();

  if (user?.role !== "MASTER") return <Navigate to="/login" replace />;

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/master" replace />} />
        <Route path="/page" element={<LandingPage />} />
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/consentimento-biometria" element={<ConsentimentoBiometria />} />
        <Route path="/contrato-de-tratamento-de-dados" element={<ContratoTratamentoDados />} />
        <Route path="/master" element={<MasterLayout />}>
          <Route index element={<MasterDashboard />} />
          <Route path="companies" element={<MasterCompanies />} />
          <Route path="companies/:id" element={<CompanyManagePage />} />
          <Route path="audit-logs" element={<MasterAuditLogs />} />
          <Route path="meus-dados" element={<MeusDadosPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}