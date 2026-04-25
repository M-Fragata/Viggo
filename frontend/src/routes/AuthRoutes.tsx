import { Routes, Route } from "react-router"

import { LoginPage } from "../pages/loginPage"
import { SignupPage } from "../pages/signupPage"

export function AuthRoutes() {
    return (
        <Routes>
            <Route>
                <Route path="/" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
            </Route>
        </Routes>
    )
}