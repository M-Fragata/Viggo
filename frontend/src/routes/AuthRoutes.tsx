import { Routes, Route } from "react-router"

import { LoginPage } from "../pages/loginPage"
import { SignupPage } from "../pages/signupPage"
import { LayoutPage } from "../pages/layoutPage"

export function AuthRoutes(){
    return (
        <Routes>
            <Route path="/" element={<LayoutPage />}>
                <Route path="/" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
            </Route>
        </Routes>
    )
}