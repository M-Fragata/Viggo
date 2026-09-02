import { Router } from "express";

import { sessionRoutes } from "./sessionRoutes.js";
import { checkinRoutes } from "./checkinRoutes.js";
import { employeesRoutes } from "./employeesRoutes.js";
import { companyRoutes } from "./companyRoutes.js";
import { masterRoutes } from "./masterRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { consentRoutes } from "./consentRoutes.js";
import { privacyRoutes } from "./privacyRoutes.js";
import { justificativaRoutes } from "./justificativaRoutes.js";
import { workScheduleRoutes } from "./workScheduleRoutes.js";
import { biometricRevalidationRoutes } from "./biometricRevalidationRoutes.js";
import { totemRoutes } from "./totemRoutes.js";
import { metricsRoutes } from "./metricsRoutes.js";
import { espelhoRoutes } from "./espelhoRoutes.js";
import { workLocationRoutes } from "./workLocationRoutes.js";

const routes = Router();

routes.use("/sessions", sessionRoutes);
routes.use("/auth", authRoutes);
routes.use("/checkins", checkinRoutes);
routes.use("/employees", employeesRoutes);
routes.use("/companies", companyRoutes);
routes.use("/master", masterRoutes);
routes.use("/consentimentos", consentRoutes);
routes.use("/privacy", privacyRoutes);
routes.use("/justificativas", justificativaRoutes);
routes.use("/work-schedules", workScheduleRoutes);
routes.use("/biometric-revalidation", biometricRevalidationRoutes);
routes.use("/totem", totemRoutes);
routes.use("/metrics", metricsRoutes);
routes.use("/espelhos", espelhoRoutes);
routes.use("/work-locations", workLocationRoutes);

export { routes }