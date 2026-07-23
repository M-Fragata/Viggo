import { Router } from "express";

import { sessionRoutes } from "./sessionRoutes.js";
import { checkinRoutes } from "./checkinRoutes.js";
import { employeesRoutes } from "./employeesRoutes.js";
import { companyRoutes } from "./companyRoutes.js";
import { masterRoutes } from "./masterRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { consentRoutes } from "./consentRoutes.js";
import { privacyRoutes } from "./privacyRoutes.js";

const routes = Router();

routes.use("/sessions", sessionRoutes);
routes.use("/auth", authRoutes);
routes.use("/checkins", checkinRoutes);
routes.use("/employees", employeesRoutes);
routes.use("/companies", companyRoutes);
routes.use("/master", masterRoutes);
routes.use("/consentimentos", consentRoutes);
routes.use("/privacy", privacyRoutes);

export { routes }