import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { LayoutPage } from "../pages/layoutPage";
import { PontoPage } from "../pages/pontoPage";
import { useAuth } from "../hooks/useAuth";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

// Skeletons para fallback visual sem spinner verde
import { PontoViewPageSkeleton } from "../components/PontoViewPageSkeleton";
import { RegisterFaceSkeleton } from "../components/RegisterFaceSkeleton";
import { MeusDadosSkeleton } from "../components/profile/MeusDadosSkeleton";
import { JustificativasSkeleton } from "../components/justificativas/JustificativasSkeleton";
import { MeusEspelhosSkeleton } from "../components/espelhos/MeusEspelhosSkeleton";
import { PageSkeleton } from "../components/common/PageSkeleton";

// Rotas secundárias em lazy-load
const PontoViewPage = lazyWithRetry(() => import("../pages/pontoViewPage").then((m) => ({ default: m.PontoViewPage })));
const RegisterFace = lazyWithRetry(() => import("../pages/RegisterFace").then((m) => ({ default: m.RegisterFace })));
const MeusDadosPage = lazyWithRetry(() => import("../pages/MeusDadosPage").then((m) => ({ default: m.MeusDadosPage })));
const JustificativasPage = lazyWithRetry(() => import("../pages/JustificativasPage").then((m) => ({ default: m.JustificativasPage })));
const MeusEspelhosPage = lazyWithRetry(() => import("../pages/MeusEspelhosPage").then((m) => ({ default: m.MeusEspelhosPage })));

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
        <Route path="/page" element={<Suspense fallback={<PageSkeleton />}><LandingPage /></Suspense>} />
        <Route path="/termos-de-uso" element={<Suspense fallback={<PageSkeleton />}><TermosDeUso /></Suspense>} />
        <Route path="/politica-privacidade" element={<Suspense fallback={<PageSkeleton />}><PoliticaPrivacidade /></Suspense>} />
        <Route path="/consentimento-biometria" element={<Suspense fallback={<PageSkeleton />}><ConsentimentoBiometria /></Suspense>} />
        <Route path="/contrato-de-tratamento-de-dados" element={<Suspense fallback={<PageSkeleton />}><ContratoTratamentoDados /></Suspense>} />

        <Route path="/" element={<LayoutPage />}>
          {/* Rota padrão (PontoPage) carregada estaticamente para renderização instantânea pós-login */}
          <Route index element={<PontoPage />} />
          <Route path="ponto" element={<PontoPage />} />

          {/* Páginas secundárias em lazy-load com skeletons dedicados */}
          <Route path="pontos" element={<Suspense fallback={<PontoViewPageSkeleton />}><PontoViewPage /></Suspense>} />
          <Route path="register" element={<Suspense fallback={<RegisterFaceSkeleton />}><RegisterFace /></Suspense>} />
          <Route path="meus-dados" element={<Suspense fallback={<MeusDadosSkeleton />}><MeusDadosPage /></Suspense>} />
          <Route path="justificativas" element={<Suspense fallback={<JustificativasSkeleton />}><JustificativasPage /></Suspense>} />
          <Route path="espelhos" element={<Suspense fallback={<MeusEspelhosSkeleton />}><MeusEspelhosPage /></Suspense>} />
          <Route path="espelho" element={<Suspense fallback={<MeusEspelhosSkeleton />}><MeusEspelhosPage /></Suspense>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}