import { Routes, Route } from "react-router";

import { LoginPage } from "../pages/loginPage";
import { AcceptInvitePage } from "../components/company";

export function AuthRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
    </Routes>
  );
}