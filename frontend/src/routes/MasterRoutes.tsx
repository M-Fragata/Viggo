import { Routes, Route, Navigate } from "react-router";
import { lazy } from "react";
import { MasterLayout } from "../components/master/MasterLayout";
import { MasterDashboard } from "../pages/MasterDashboard";
import { MasterCompanies } from "../pages/MasterCompanies";
import { MasterAuditLogs } from "../pages/MasterAuditLogs";
import { CompanyManagePage } from "../pages/CompanyManagePage";
import { MeusDadosPage } from "../pages/MeusDadosPage";
import { useAuth } from "../hooks/useAuth";
import { NotFoundPage } from "../pages/NotFoundPage";

const LandingPage = lazy(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const TermosDeUso = lazy(() => import("../pages/TermosDeUso").then((m) => ({ default: m.TermosDeUso })));
const PoliticaPrivacidade = lazy(() => import("../pages/PoliticaPrivacidade").then((m) => ({ default: m.PoliticaPrivacidade })));
const ConsentimentoBiometria = lazy(() => import("../pages/ConsentimentoBiometria").then((m) => ({ default: m.ConsentimentoBiometria })));
const ContratoTratamentoDados = lazy(() => import("../pages/ContratoTratamentoDados").then((m) => ({ default: m.ContratoTratamentoDados })));

export function MasterRoutes() {
  const { user } = useAuth();

  if (user?.role !== "MASTER") return <Navigate to="/login" replace />;

  return (
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
  );
}