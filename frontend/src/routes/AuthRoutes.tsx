import { Routes, Route } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "../components/Loading";
import { NotFoundPage } from "../pages/NotFoundPage";

const LandingPage = lazy(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("../pages/loginPage").then((m) => ({ default: m.LoginPage })));
const CompanySignupPage = lazy(() => import("../pages/CompanySignupPage").then((m) => ({ default: m.CompanySignupPage })));
const AcceptInvitePage = lazy(() => import("../components/company/AcceptInvitePage").then((m) => ({ default: m.AcceptInvitePage })));
const CustomPlanPage = lazy(() => import("../pages/CustomPlanPage").then((m) => ({ default: m.CustomPlanPage })));
const TermosDeUso = lazy(() => import("../pages/TermosDeUso").then((m) => ({ default: m.TermosDeUso })));
const PoliticaPrivacidade = lazy(() => import("../pages/PoliticaPrivacidade").then((m) => ({ default: m.PoliticaPrivacidade })));
const ConsentimentoBiometria = lazy(() => import("../pages/ConsentimentoBiometria").then((m) => ({ default: m.ConsentimentoBiometria })));
const ContratoTratamentoDados = lazy(() => import("../pages/ContratoTratamentoDados").then((m) => ({ default: m.ContratoTratamentoDados })));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })) );

export function AuthRoutes() {
  return (
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
  );
}