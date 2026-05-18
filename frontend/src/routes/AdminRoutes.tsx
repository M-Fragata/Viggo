import { Routes, Route } from "react-router"

import { DashboardPage } from "../pages/DashboardPage"
import { LayoutPage } from "../pages/layoutPage"

import { UserRoutes } from "./UserRoutes"

export function AdminRoutes() {
    return (
        <Routes>
            <Route path="/*" element={<UserRoutes />} />
            <Route path="/admin" element={<LayoutPage />}>
                <Route path="/admin" element={<DashboardPage />} />
            </Route>
        </Routes>
    )
}