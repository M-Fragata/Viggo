import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { MasterLayout } from "../components/master/MasterLayout";
import { MasterDashboard } from "../pages/MasterDashboard";
import { useAuth } from "../hooks/useAuth";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

// Skeletons
import { MasterCompaniesSkeleton } from "../components/master/MasterCompaniesSkeleton";
import { CompanyManageSkeleton } from "../components/master/CompanyManageSkeleton";
import { MeusDadosSkeleton } from "../components/profile/MeusDadosSkeleton";
import { PageSkeleton } from "../components/common/PageSkeleton";

// Rotas secundárias em lazy-load
const MasterCompanies = lazyWithRetry(() => import("../pages/MasterCompanies").then((m) => ({ default: m.MasterCompanies })));
const CompanyManagePage = lazyWithRetry(() => import("../pages/CompanyManagePage").then((m) => ({ default: m.CompanyManagePage })));
const MasterAuditLogs = lazyWithRetry(() => import("../pages/MasterAuditLogs").then((m) => ({ default: m.MasterAuditLogs })));
const MeusDadosPage = lazyWithRetry(() => import("../pages/MeusDadosPage").then((m) => ({ default: m.MeusDadosPage })));

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
        <Route path="/page" element={<Suspense fallback={<PageSkeleton />}><LandingPage /></Suspense>} />
        <Route path="/termos-de-uso" element={<Suspense fallback={<PageSkeleton />}><TermosDeUso /></Suspense>} />
        <Route path="/politica-privacidade" element={<Suspense fallback={<PageSkeleton />}><PoliticaPrivacidade /></Suspense>} />
        <Route path="/consentimento-biometria" element={<Suspense fallback={<PageSkeleton />}><ConsentimentoBiometria /></Suspense>} />
        <Route path="/contrato-de-tratamento-de-dados" element={<Suspense fallback={<PageSkeleton />}><ContratoTratamentoDados /></Suspense>} />

        <Route path="/master" element={<MasterLayout />}>
          {/* Dashboard padrão carregado de forma estática */}
          <Route index element={<MasterDashboard />} />
          <Route path="companies" element={<Suspense fallback={<MasterCompaniesSkeleton />}><MasterCompanies /></Suspense>} />
          <Route path="companies/:id" element={<Suspense fallback={<CompanyManageSkeleton />}><CompanyManagePage /></Suspense>} />
          <Route path="audit-logs" element={<Suspense fallback={<PageSkeleton />}><MasterAuditLogs /></Suspense>} />
          <Route path="meus-dados" element={<Suspense fallback={<MeusDadosSkeleton />}><MeusDadosPage /></Suspense>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}