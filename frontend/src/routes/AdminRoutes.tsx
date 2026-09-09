import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { LayoutPage } from "../pages/layoutPage";
import { DashboardOverviewPage } from "../pages/admin/DashboardPage";
import { useAuth } from "../hooks/useAuth";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

// Skeletons para fallback visual
import { FuncionariosSkeleton } from "../components/admin/FuncionariosSkeleton";
import { PresentesSkeleton } from "../components/admin/PresentesSkeleton";
import { FolhaMensalSkeleton } from "../components/admin/FolhaMensalSkeleton";
import { HorariosSkeleton } from "../components/schedule/HorariosSkeleton";
import { PolosTrabalhoSkeleton } from "../components/admin/PolosTrabalhoSkeleton";
import { PlanoSkeleton } from "../components/plan/PlanoSkeleton";
import { ConvitesSkeleton } from "../components/admin/ConvitesSkeleton";
import { JustificativasSkeleton } from "../components/justificativas/JustificativasSkeleton";
import { ConfiguracoesSkeleton } from "../components/admin/ConfiguracoesSkeleton";
import { MeusEspelhosSkeleton } from "../components/espelhos/MeusEspelhosSkeleton";
import { PontoPageSkeleton } from "../components/PontoPageSkeleton";
import { PontoViewPageSkeleton } from "../components/PontoViewPageSkeleton";
import { RegisterFaceSkeleton } from "../components/RegisterFaceSkeleton";
import { MeusDadosSkeleton } from "../components/profile/MeusDadosSkeleton";
import { PageSkeleton } from "../components/common/PageSkeleton";

// Rotas secundárias em lazy-load
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

// Rotas de ponto do admin em lazy-load (raramente acessadas no painel do administrador)
const PontoPage = lazyWithRetry(() => import("../pages/pontoPage").then((m) => ({ default: m.PontoPage })));
const PontoViewPage = lazyWithRetry(() => import("../pages/pontoViewPage").then((m) => ({ default: m.PontoViewPage })));
const RegisterFace = lazyWithRetry(() => import("../pages/RegisterFace").then((m) => ({ default: m.RegisterFace })));
const MeusDadosPage = lazyWithRetry(() => import("../pages/MeusDadosPage").then((m) => ({ default: m.MeusDadosPage })));

const LandingPage = lazyWithRetry(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const TermosDeUso = lazyWithRetry(() => import("../pages/TermosDeUso").then((m) => ({ default: m.TermosDeUso })));
const PoliticaPrivacidade = lazyWithRetry(() => import("../pages/PoliticaPrivacidade").then((m) => ({ default: m.PoliticaPrivacidade })));
const ConsentimentoBiometria = lazyWithRetry(() => import("../pages/ConsentimentoBiometria").then((m) => ({ default: m.ConsentimentoBiometria })));
const ContratoTratamentoDados = lazyWithRetry(() => import("../pages/ContratoTratamentoDados").then((m) => ({ default: m.ContratoTratamentoDados })));

export function AdminRoutes() {
  const { user } = useAuth();
  const isAllowed = user?.role === "ENTERPRISE_ADMIN" || user?.role === "MASTER";

  if (!isAllowed) return <Navigate to="/login" replace />;

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/page" element={<Suspense fallback={<PageSkeleton />}><LandingPage /></Suspense>} />
        <Route path="/termos-de-uso" element={<Suspense fallback={<PageSkeleton />}><TermosDeUso /></Suspense>} />
        <Route path="/politica-privacidade" element={<Suspense fallback={<PageSkeleton />}><PoliticaPrivacidade /></Suspense>} />
        <Route path="/consentimento-biometria" element={<Suspense fallback={<PageSkeleton />}><ConsentimentoBiometria /></Suspense>} />
        <Route path="/contrato-de-tratamento-de-dados" element={<Suspense fallback={<PageSkeleton />}><ContratoTratamentoDados /></Suspense>} />

        <Route path="/" element={<LayoutPage />}>
          {/* Dashboard padrão importada de forma estática para renderização imediata pós-login */}
          <Route index element={<DashboardOverviewPage />} />

          {/* Subpáginas administrativas com skeletons especializados */}
          <Route path="funcionarios" element={<Suspense fallback={<FuncionariosSkeleton />}><FuncionariosPage /></Suspense>} />
          <Route path="presentes" element={<Suspense fallback={<PresentesSkeleton />}><PresentesPage /></Suspense>} />
          <Route path="folha-mensal" element={<Suspense fallback={<FolhaMensalSkeleton />}><FolhaMensalPage /></Suspense>} />
          <Route path="horarios" element={<Suspense fallback={<HorariosSkeleton />}><HorariosPage /></Suspense>} />
          <Route path="polos" element={<Suspense fallback={<PolosTrabalhoSkeleton />}><PolosTrabalhoPage /></Suspense>} />
          <Route path="cercas" element={<Suspense fallback={<PolosTrabalhoSkeleton />}><PolosTrabalhoPage /></Suspense>} />
          <Route path="plano" element={<Suspense fallback={<PlanoSkeleton />}><PlanoPage /></Suspense>} />
          <Route path="convites" element={<Suspense fallback={<ConvitesSkeleton />}><ConvitesPage /></Suspense>} />
          <Route path="justificativas" element={<Suspense fallback={<JustificativasSkeleton />}><JustificativasAdminPage /></Suspense>} />
          <Route path="totem" element={<Suspense fallback={<PageSkeleton />}><TotemManagePage /></Suspense>} />
          <Route path="configuracoes" element={<Suspense fallback={<ConfiguracoesSkeleton />}><ConfiguracoesPage /></Suspense>} />
          <Route path="espelhos" element={<Suspense fallback={<MeusEspelhosSkeleton />}><MeusEspelhosPage /></Suspense>} />
          <Route path="espelho" element={<Suspense fallback={<MeusEspelhosSkeleton />}><MeusEspelhosPage /></Suspense>} />

          {/* Páginas de ponto do colaborador em lazy-load no perfil de administrador */}
          <Route path="ponto" element={<Suspense fallback={<PontoPageSkeleton />}><PontoPage /></Suspense>} />
          <Route path="pontos" element={<Suspense fallback={<PontoViewPageSkeleton />}><PontoViewPage /></Suspense>} />
          <Route path="register" element={<Suspense fallback={<RegisterFaceSkeleton />}><RegisterFace /></Suspense>} />
          <Route path="meus-dados" element={<Suspense fallback={<MeusDadosSkeleton />}><MeusDadosPage /></Suspense>} />
        </Route>

        <Route path="totem-app" element={<Suspense fallback={<PageSkeleton />}><TotemPage /></Suspense>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
