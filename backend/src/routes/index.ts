import { Router } from "express";

import { sessionRoutes } from "./sessionRoutes.js";
import { checkinRoutes } from "./checkinRoutes.js";
import { employeesRoutes } from "./employeesRoutes.js";

const routes = Router();

routes.use("/sessions", sessionRoutes);
routes.use("/checkins", checkinRoutes);
routes.use("/employees", employeesRoutes);

export { routes }