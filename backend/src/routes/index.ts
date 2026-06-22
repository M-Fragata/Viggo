import { Router } from "express";

import { sessionRoutes } from "./sessionRoutes.js";
import { checkinRoutes } from "./checkinRoutes.js";
import { employeesRoutes } from "./employeesRoutes.js";
import { companyRoutes } from "./companyRoutes.js";
import { masterRoutes } from "./masterRoutes.js";

const routes = Router();

routes.use("/sessions", sessionRoutes);
routes.use("/checkins", checkinRoutes);
routes.use("/employees", employeesRoutes);
routes.use("/companies", companyRoutes);
routes.use("/master", masterRoutes);

export { routes }