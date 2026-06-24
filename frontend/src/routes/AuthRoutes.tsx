import { Routes, Route, Navigate } from "react-router";
import { LoginPage } from "../pages/loginPage";
import { AcceptInvitePage } from "../components/company";

export function AuthRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}