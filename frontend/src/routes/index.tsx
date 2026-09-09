import { Suspense } from "react";
import { BrowserRouter } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { AuthRoutes } from "./AuthRoutes";
import { lazyWithRetry } from "../utils/lazyWithRetry";

// Skeletons por perfil de usuário para transição visual suave
import { PontoPageSkeleton } from "../components/PontoPageSkeleton";
import { DashboardSkeleton } from "../components/admin/DashboardSkeleton";
import { MasterDashboardSkeleton } from "../components/master/MasterDashboardSkeleton";

// Code splitting nas rotas autenticadas para isolar o bundle de login
const UserRoutes = lazyWithRetry(() => import("./UserRoutes").then((m) => ({ default: m.UserRoutes })));
const AdminRoutes = lazyWithRetry(() => import("./AdminRoutes").then((m) => ({ default: m.AdminRoutes })));
const MasterRoutes = lazyWithRetry(() => import("./MasterRoutes").then((m) => ({ default: m.MasterRoutes })));

function RoleRoutes({ role }: { role?: string }) {
  switch (role) {
    case "EMPLOYEE":
      return (
        <Suspense fallback={<PontoPageSkeleton />}>
          <UserRoutes />
        </Suspense>
      );
    case "ENTERPRISE_ADMIN":
      return (
        <Suspense fallback={<DashboardSkeleton />}>
          <AdminRoutes />
        </Suspense>
      );
    case "MASTER":
      return (
        <Suspense fallback={<MasterDashboardSkeleton />}>
          <MasterRoutes />
        </Suspense>
      );
    default:
      return <AuthRoutes />;
  }
}

export function AppRoutes() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <RoleRoutes role={user?.role} />
    </BrowserRouter>
  );
}