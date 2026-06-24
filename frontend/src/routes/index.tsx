import { BrowserRouter } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { Loading } from "../components/Loading";

//Importando rotas
import { AuthRoutes } from "./AuthRoutes";
import { AdminRoutes } from "./AdminRoutes";
import { UserRoutes } from "./UserRoutes";
import { MasterRoutes } from "./MasterRoutes";

export function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;

  function Route() {
    switch (user?.role) {
      case "EMPLOYEE":
        return <UserRoutes />;
      case "ENTERPRISE_ADMIN":
        return <AdminRoutes />;
      case "MASTER":
        return <MasterRoutes />;
      default:
        return <AuthRoutes />;
    }
  }

  return (
    <BrowserRouter>
      <Route />
    </BrowserRouter>
  );
}