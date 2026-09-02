import { Routes, Route, Navigate } from "react-router";
import { Suspense } from "react";
import { LayoutPage } from "../pages/layoutPage";
import { PontoPage } from "../pages/pontoPage";
import { PontoViewPage } from "../pages/pontoViewPage";
import { RegisterFace } from "../pages/RegisterFace";
import { MeusDadosPage } from "../pages/MeusDadosPage";
import { useAuth } from "../hooks/useAuth";
import { NotFoundPage } from "../pages/NotFoundPage";
import { Loading } from "../components/Loading";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const LandingPage = lazyWithRetry(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const TermosDeUso = lazyWithRetry(() => import("../pages/TermosDeUso").then((m) => ({ default: m.TermosDeUso })));
const PoliticaPrivacidade = lazyWithRetry(() => import("../pages/PoliticaPrivacidade").then((m) => ({ default: m.PoliticaPrivacidade })));
const ConsentimentoBiometria = lazyWithRetry(() => import("../pages/ConsentimentoBiometria").then((m) => ({ default: m.ConsentimentoBiometria })));
const ContratoTratamentoDados = lazyWithRetry(() => import("../pages/ContratoTratamentoDados").then((m) => ({ default: m.ContratoTratamentoDados })));

const DashboardOverviewPage = lazyWithRetry(() => import("../pages/admin/DashboardPage").then((m) => ({ default: m.DashboardOverviewPage })));
const FuncionariosPage = lazyWithRetry(() => import("../pages/admin/FuncionariosPage").then((m) => ({ default: m.FuncionariosPage })));
const PresentesPage = lazyWithRetry(() => import("../pages/admin/PresentesPage").then((m) => ({ default: m.PresentesPage })));
const FolhaMensalPage = lazyWithRetry(() => import("../pages/admin/FolhaMensalPage").then((m) => ({ default: m.FolhaMensalPage })));
const HorariosPage = lazyWithRetry(() => import("../pages/admin/HorariosPage").then((m) => ({ default: m.HorariosPage })));
const PlanoPage = lazyWithRetry(() => import("../pages/admin/PlanoPage").then((m) => ({ default: m.PlanoPage })));
const ConvitesPage = lazyWithRetry(() => import("../pages/admin/ConvitesPage").then((m) => ({ default: m.ConvitesPage })));
const JustificativasAdminPage = lazyWithRetry(() => import("../pages/admin/JustificativasAdminPage").then((m) => ({ default: m.JustificativasAdminPage })));
const TotemManagePage = lazyWithRetry(() => import("../pages/admin/TotemManagePage").then((m) => ({ default: m.TotemManagePage })));
const TotemPage = lazyWithRetry(() => import("../pages/admin/TotemPage").then((m) => ({ default: m.TotemPage })));
const ConfiguracoesPage = lazyWithRetry(() => import("../pages/admin/ConfiguracoesPage").then((m) => ({ default: m.ConfiguracoesPage })));
const MeusEspelhosPage = lazyWithRetry(() => import("../pages/MeusEspelhosPage").then((m) => ({ default: m.MeusEspelhosPage })));
const PolosTrabalhoPage = lazyWithRetry(() => import("../pages/admin/PolosTrabalhoPage").then((m) => ({ default: m.PolosTrabalhoPage })));

export function AdminRoutes() {
  const { user } = useAuth();
  const isAllowed = user?.role === "ENTERPRISE_ADMIN" || user?.role === "MASTER";

  if (!isAllowed) return <Navigate to="/login" replace />;

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/page" element={<LandingPage />} />
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/consentimento-biometria" element={<ConsentimentoBiometria />} />
        <Route path="/contrato-de-tratamento-de-dados" element={<ContratoTratamentoDados />} />
        <Route path="/" element={<LayoutPage />}>
          <Route index element={<Suspense fallback={<Loading />}><DashboardOverviewPage /></Suspense>} />
          <Route path="funcionarios" element={<Suspense fallback={<Loading />}><FuncionariosPage /></Suspense>} />
          <Route path="presentes" element={<Suspense fallback={<Loading />}><PresentesPage /></Suspense>} />
          <Route path="folha-mensal" element={<Suspense fallback={<Loading />}><FolhaMensalPage /></Suspense>} />
          <Route path="horarios" element={<Suspense fallback={<Loading />}><HorariosPage /></Suspense>} />
          <Route path="polos" element={<Suspense fallback={<Loading />}><PolosTrabalhoPage /></Suspense>} />
          <Route path="cercas" element={<Suspense fallback={<Loading />}><PolosTrabalhoPage /></Suspense>} />
          <Route path="plano" element={<Suspense fallback={<Loading />}><PlanoPage /></Suspense>} />
          <Route path="convites" element={<Suspense fallback={<Loading />}><ConvitesPage /></Suspense>} />
          <Route path="justificativas" element={<Suspense fallback={<Loading />}><JustificativasAdminPage /></Suspense>} />
          <Route path="totem" element={<Suspense fallback={<Loading />}><TotemManagePage /></Suspense>} />
          <Route path="configuracoes" element={<Suspense fallback={<Loading />}><ConfiguracoesPage /></Suspense>} />
          <Route path="espelhos" element={<Suspense fallback={<Loading />}><MeusEspelhosPage /></Suspense>} />
          <Route path="espelho" element={<Suspense fallback={<Loading />}><MeusEspelhosPage /></Suspense>} />
          <Route path="ponto" element={<PontoPage />} />
          <Route path="pontos" element={<PontoViewPage />} />
          <Route path="register" element={<RegisterFace />} />
          <Route path="meus-dados" element={<MeusDadosPage />} />
        </Route>
        <Route path="totem-app" element={<Suspense fallback={<Loading />}><TotemPage /></Suspense>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
