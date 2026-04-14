import { Router } from "express";

import { sessionRoutes } from "./sessionRoutes.js";

const routes = Router();

routes.use("/sessions", sessionRoutes);

export { routes }