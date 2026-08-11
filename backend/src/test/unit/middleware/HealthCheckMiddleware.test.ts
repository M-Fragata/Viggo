import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import {
  healthCheck,
  readinessCheck,
  healthCheckMiddleware,
  setReady,
} from "../../../middleware/HealthCheckMiddleware.js";
import { prisma } from "../../../database/prisma.js";

describe("HealthCheckMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setReady(false);
  });

  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  describe("healthCheck", () => {
    it("deve retornar 200 com status ok", () => {
      const req = {};
      const res = mockRes();

      healthCheck(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ok",
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          memory: expect.any(Object),
        })
      );
    });

    it("deve incluir versão", () => {
      const req = {};
      const res = mockRes();

      healthCheck(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          version: expect.any(String),
        })
      );
    });
  });

  describe("readinessCheck", () => {
    it("deve retornar 503 quando não está pronto", async () => {
      setReady(false);
      const req = {};
      const res = mockRes();

      await readinessCheck(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "not ready",
          reason: "Service not ready",
        })
      );
    });

    it("deve retornar 200 quando pronto e DB conectado", async () => {
      setReady(true);
      (prisma.$queryRaw as any).mockResolvedValue([{ "?column?": 1 }]);

      const req = {};
      const res = mockRes();

      await readinessCheck(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ready",
          database: "connected",
        })
      );
    });

    it("deve retornar 503 quando DB desconectado", async () => {
      setReady(true);
      (prisma.$queryRaw as any).mockRejectedValue(
        new Error("Connection refused")
      );

      const req = {};
      const res = mockRes();

      await readinessCheck(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "not ready",
          database: "disconnected",
        })
      );
    });
  });

  describe("healthCheckMiddleware", () => {
    it("deve rotear /health para healthCheck", () => {
      const req = { path: "/health" };
      const res = mockRes();

      healthCheckMiddleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve rotear /ready para readinessCheck", async () => {
      setReady(true);
      (prisma.$queryRaw as any).mockResolvedValue([{ "?column?": 1 }]);

      const req = { path: "/ready" };
      const res = mockRes();

      await healthCheckMiddleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve chamar next() para outras rotas", () => {
      const req = { path: "/api/users" };
      const res = mockRes();

      healthCheckMiddleware(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("setReady", () => {
    it("deve alternar estado de readiness", async () => {
      setReady(false);
      (prisma.$queryRaw as any).mockResolvedValue([]);

      const req = {};
      const res1 = mockRes();
      await readinessCheck(req as any, res1 as any);
      expect(res1.status).toHaveBeenCalledWith(503);

      setReady(true);
      const res2 = mockRes();
      await readinessCheck(req as any, res2 as any);
      expect(res2.status).toHaveBeenCalledWith(200);
    });
  });
});
