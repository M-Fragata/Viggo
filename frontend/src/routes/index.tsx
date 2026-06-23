import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router";

import { LoginPage } from "../pages/loginPage";
import { AcceptInvitePage } from "../components/company";
import { LayoutPage } from "../pages/layoutPage";
import { DashboardPage } from "../pages/DashboardPage";
import { PontoPage } from "../pages/pontoPage";
import { PontoViewPage } from "../pages/pontoViewPage";
import { RegisterFace } from "../pages/RegisterFace";
import { MasterLayout } from "../components/master/MasterLayout";
import { MasterDashboard } from "../pages/MasterDashboard";
import { MasterCompanies } from "../pages/MasterCompanies";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const storageUser = localStorage.getItem("@viggo:user");
  const user = storageUser ? JSON.parse(storageUser) : { role: "" };

  if (!storageUser) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoutes() {
  return (
    <RouterRoutes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
    </RouterRoutes>
  );
}

function AdminRoutes() {
  return (
    <ProtectedRoute allowedRoles={["ENTERPRISE_ADMIN", "EMPLOYEE", "MASTER"]}>
      <RouterRoutes>
        <Route path="/" element={<LayoutPage />}>
          <Route index element={<PontoPage />} />
          <Route path="pontos" element={<PontoViewPage />} />
          <Route path="register" element={<RegisterFace />} />
        </Route>
        <Route path="/admin" element={<LayoutPage />}>
          <Route index element={<DashboardPage />} />
        </Route>
      </RouterRoutes>
    </ProtectedRoute>
  );
}

function UserRoutes() {
  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
      <RouterRoutes>
        <Route path="/" element={<LayoutPage />}>
          <Route index element={<PontoPage />} />
          <Route path="pontos" element={<PontoViewPage />} />
          <Route path="register" element={<RegisterFace />} />
        </Route>
      </RouterRoutes>
    </ProtectedRoute>
  );
}

function MasterRoutes() {
  return (
    <ProtectedRoute allowedRoles={["MASTER"]}>
      <RouterRoutes>
        <Route path="/master" element={<MasterLayout />}>
          <Route index element={<MasterDashboard />} />
          <Route path="companies" element={<MasterCompanies />} />
        </Route>
      </RouterRoutes>
    </ProtectedRoute>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <RouterRoutes>
        <Route path="/*" element={<PublicRoutes />} />
        <Route path="/*" element={<AdminRoutes />} />
        <Route path="/*" element={<UserRoutes />} />
        <Route path="/*" element={<MasterRoutes />} />
      </RouterRoutes>
    </BrowserRouter>
  );
}