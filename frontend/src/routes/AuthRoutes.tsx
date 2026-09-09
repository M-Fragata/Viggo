import { Routes, Route } from "react-router";
import { Suspense } from "react";
import { LoginPageSkeleton } from "../components/auth/LoginPageSkeleton";
import { PageSkeleton } from "../components/common/PageSkeleton";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const LandingPage = lazyWithRetry(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazyWithRetry(() => import("../pages/loginPage").then((m) => ({ default: m.LoginPage })));
const CompanySignupPage = lazyWithRetry(() => import("../pages/CompanySignupPage").then((m) => ({ default: m.CompanySignupPage })));
const AcceptInvitePage = lazyWithRetry(() => import("../components/company/AcceptInvitePage").then((m) => ({ default: m.AcceptInvitePage })));
const CustomPlanPage = lazyWithRetry(() => import("../pages/CustomPlanPage").then((m) => ({ default: m.CustomPlanPage })));
const TermosDeUso = lazyWithRetry(() => import("../pages/TermosDeUso").then((m) => ({ default: m.TermosDeUso })));
const PoliticaPrivacidade = lazyWithRetry(() => import("../pages/PoliticaPrivacidade").then((m) => ({ default: m.PoliticaPrivacidade })));
const ConsentimentoBiometria = lazyWithRetry(() => import("../pages/ConsentimentoBiometria").then((m) => ({ default: m.ConsentimentoBiometria })));
const ContratoTratamentoDados = lazyWithRetry(() => import("../pages/ContratoTratamentoDados").then((m) => ({ default: m.ContratoTratamentoDados })));
const ForgotPasswordPage = lazyWithRetry(() => import("../pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));

export function AuthRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Suspense fallback={<LoginPageSkeleton />}><LoginPage /></Suspense>} />
        <Route path="/page" element={<Suspense fallback={<PageSkeleton />}><LandingPage /></Suspense>} />
        <Route path="/company/signup" element={<Suspense fallback={<PageSkeleton />}><CompanySignupPage /></Suspense>} />
        <Route path="/accept-invite/:token" element={<Suspense fallback={<PageSkeleton />}><AcceptInvitePage /></Suspense>} />
        <Route path="/planos/custom" element={<Suspense fallback={<PageSkeleton />}><CustomPlanPage /></Suspense>} />
        <Route path="/termos-de-uso" element={<Suspense fallback={<PageSkeleton />}><TermosDeUso /></Suspense>} />
        <Route path="/politica-privacidade" element={<Suspense fallback={<PageSkeleton />}><PoliticaPrivacidade /></Suspense>} />
        <Route path="/consentimento-biometria" element={<Suspense fallback={<PageSkeleton />}><ConsentimentoBiometria /></Suspense>} />
        <Route path="/contrato-de-tratamento-de-dados" element={<Suspense fallback={<PageSkeleton />}><ContratoTratamentoDados /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<PageSkeleton />}><ForgotPasswordPage /></Suspense>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}