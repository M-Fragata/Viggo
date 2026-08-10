import express from "express";
import cors from "cors";
import helmet from "helmet";
import { routes } from "../../routes/index.js";

export function createTestApp() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/ready", (_req, res) => {
    res.json({ status: "ready" });
  });

  app.use(routes);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("[TestApp] Error:", err.message);
      res.status(500).json({ message: "Internal server error" });
    }
  );

  return app;
}
