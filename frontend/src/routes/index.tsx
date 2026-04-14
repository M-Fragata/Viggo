import { BrowserRouter } from "react-router"

import { AuthRoutes } from "./AuthRoutes"
import { AdminRoutes } from "./AdminRoutes"
import { UserRoutes } from "./UserRoutes"

export function Routes(){

    const storageUser = localStorage.getItem("@viggo:user")

    const user = storageUser ? JSON.parse(storageUser) : { role: "" }

    function AcessRoute() {

        switch(user.role) {
            case "admin":
                return < AdminRoutes/>
            case "user":
                return < UserRoutes/>
            default:
                return < AuthRoutes/>
        }

    }

    return (
        <BrowserRouter>
            <AcessRoute />
        </BrowserRouter>
    )
}