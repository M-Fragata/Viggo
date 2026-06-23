import { Routes, Route } from "react-router";

import { MasterLayout } from "../components/master/MasterLayout";
import { MasterDashboard } from "../pages/MasterDashboard";
import { MasterCompanies } from "../pages/MasterCompanies";

export function MasterRoutes() {
  return (
    <Routes>
      <Route path="/master" element={<MasterLayout />}>
        <Route index element={<MasterDashboard />} />
        <Route path="companies" element={<MasterCompanies />} />
      </Route>
    </Routes>
  );
}