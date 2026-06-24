import { Routes, Route, Navigate } from "react-router";
import { LayoutPage } from "../pages/layoutPage";
import { PontoPage } from "../pages/pontoPage";
import { PontoViewPage } from "../pages/pontoViewPage";
import { RegisterFace } from "../pages/RegisterFace";
import { useAuth } from "../hooks/useAuth";

export function UserRoutes() {
  const { user } = useAuth();

  if (user?.role !== "EMPLOYEE") return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/" element={<LayoutPage />}>
        <Route index element={<PontoPage />} />
        <Route path="pontos" element={<PontoViewPage />} />
        <Route path="register" element={<RegisterFace />} />
      </Route>
    </Routes>
  );
}