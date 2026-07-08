import { Routes, Route, Navigate } from "react-router";
import { lazy } from "react";
import { MasterLayout } from "../components/master/MasterLayout";
import { MasterDashboard } from "../pages/MasterDashboard";
import { MasterCompanies } from "../pages/MasterCompanies";
import { useAuth } from "../hooks/useAuth";

const LandingPage = lazy(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));

export function MasterRoutes() {
  const { user } = useAuth();

  if (user?.role !== "MASTER") return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/page" element={<LandingPage />} />
      <Route path="/master" element={<MasterLayout />}>
        <Route index element={<MasterDashboard />} />
        <Route path="companies" element={<MasterCompanies />} />
      </Route>
    </Routes>
  );
}