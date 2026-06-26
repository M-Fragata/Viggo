import { Routes, Route } from "react-router";
import { lazy, Suspense } from "react";
import { Loading } from "../components/Loading";

const LandingPage = lazy(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("../pages/loginPage").then((m) => ({ default: m.LoginPage })));
const CompanySignupPage = lazy(() => import("../pages/CompanySignupPage").then((m) => ({ default: m.CompanySignupPage })));
const AcceptInvitePage = lazy(() => import("../components/company/AcceptInvitePage").then((m) => ({ default: m.AcceptInvitePage })));
const CustomPlanPage = lazy(() => import("../pages/CustomPlanPage").then((m) => ({ default: m.CustomPlanPage })));

export function AuthRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/company/signup" element={<CompanySignupPage />} />
        <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
        <Route path="/planos/custom" element={<CustomPlanPage />} />
      </Routes>
    </Suspense>
  );
}