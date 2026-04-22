import { Routes, Route } from "react-router"

import { DashboardPage } from "../pages/DashboardPage"
import { LayoutPage } from "../pages/layoutPage"

export function AdminRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LayoutPage />}>
                <Route path="/" element={ <DashboardPage />}/>
            </Route>
        </Routes>
    )
}