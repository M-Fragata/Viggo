import { BrowserRouter } from "react-router"

import { AuthRoutes } from "./AuthRoutes"
import { AdminRoutes } from "./AdminRoutes"
import { UserRoutes } from "./UserRoutes"

function AccessRoute({ userRole }: { userRole: string }) {
    switch (userRole) {
        case "ADMIN":
            return <AdminRoutes />
        case "USER":
            return <UserRoutes />
        default:
            return <AuthRoutes />
    }
}

export function Routes() {
    const storageUser = localStorage.getItem("@viggo:user")

    const user = storageUser ? JSON.parse(storageUser) : { role: "" }

    return (
        <BrowserRouter>
            <AccessRoute userRole={user.role} />
        </BrowserRouter>
    )
}