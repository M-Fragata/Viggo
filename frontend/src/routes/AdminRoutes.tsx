import { Routes, Route, Navigate } from "react-router";
import { LayoutPage } from "../pages/layoutPage";
import { DashboardPage } from "../pages/DashboardPage";
import { PontoPage } from "../pages/pontoPage";
import { PontoViewPage } from "../pages/pontoViewPage";
import { RegisterFace } from "../pages/RegisterFace";
import { useAuth } from "../hooks/useAuth";

export function AdminRoutes() {
  const { user } = useAuth();
  const isAllowed = user?.role === "ENTERPRISE_ADMIN" || user?.role === "MASTER";

  if (!isAllowed) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/" element={<LayoutPage />}>
        <Route index element={<PontoPage />} />
        <Route path="pontos" element={<PontoViewPage />} />
        <Route path="register" element={<RegisterFace />} />
      </Route>
      <Route path="/admin" element={<LayoutPage />}>
        <Route index element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}