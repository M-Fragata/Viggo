import { Routes, Route } from "react-router"

import { PontoPage } from "../pages/pontoPage"
import { PontoViewPage } from "../pages/pontoViewPage"
import { RegisterFace } from "../pages/RegisterFace"

import { LayoutPage } from "../pages/layoutPage"

export function UserRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LayoutPage />}>
                <Route path="/" element={<PontoPage />} />
                <Route path="/pontos" element={<PontoViewPage />} />
                <Route path="/register" element={<RegisterFace />} />
            </Route>
        </Routes>
    )
}