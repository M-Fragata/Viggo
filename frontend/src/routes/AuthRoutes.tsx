import { Routes, Route } from "react-router";
import { Suspense } from "react";
import { Loading } from "../components/Loading";
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
const ForgotPasswordPage = lazyWithRetry(() => import("../pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })) );

export function AuthRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/page" element={<LandingPage />} />
          <Route path="/company/signup" element={<CompanySignupPage />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
          <Route path="/planos/custom" element={<CustomPlanPage />} />
          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
          <Route path="/consentimento-biometria" element={<ConsentimentoBiometria />} />
          <Route path="/contrato-de-tratamento-de-dados" element={<ContratoTratamentoDados />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}