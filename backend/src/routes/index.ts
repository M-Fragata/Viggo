import { Router } from "express";

import { sessionRoutes } from "./sessionRoutes.js";
import { checkinRoutes } from "./checkinRoutes.js";

const routes = Router();

routes.use("/sessions", sessionRoutes);
routes.use("/checkins", checkinRoutes);

export { routes }