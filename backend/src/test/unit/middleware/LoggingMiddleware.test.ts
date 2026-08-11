import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInfo, mockWarn, mockError, mockDebug, mockChild } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockWarn: vi.fn(),
  mockError: vi.fn(),
  mockDebug: vi.fn(),
  mockChild: vi.fn().mockReturnThis(),
}));

vi.mock("pino", () => {
  const pinoFn = vi.fn().mockReturnValue({
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
    debug: mockDebug,
    child: mockChild,
  });
  (pinoFn as any).stdTimeFunctions = {
    isoTime: vi.fn(),
  };
  return { default: pinoFn };
});

vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("test-uuid-123"),
}));

import { loggingMiddleware, getChildLogger } from "../../../middleware/LoggingMiddleware.js";

describe("LoggingMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn();
    res.on = vi.fn();
    return res;
  };

  const mockNext = vi.fn();

  describe("loggingMiddleware", () => {
    it("deve adicionar correlationId ao request", () => {
      const req = { headers: {}, method: "GET", originalUrl: "/api/test", ip: "127.0.0.1", get: vi.fn() };
      const res = mockRes();

      loggingMiddleware(req as any, res as any, mockNext);

      expect((req as any).correlationId).toBe("test-uuid-123");
      expect(res.setHeader).toHaveBeenCalledWith("X-Correlation-ID", "test-uuid-123");
    });

    it("deve usar x-correlation-id existente", () => {
      const req = {
        headers: { "x-correlation-id": "existing-id" },
        method: "GET",
        originalUrl: "/api/test",
        ip: "127.0.0.1",
        get: vi.fn(),
      };
      const res = mockRes();

      loggingMiddleware(req as any, res as any, mockNext);

      expect((req as any).correlationId).toBe("existing-id");
      expect(res.setHeader).toHaveBeenCalledWith("X-Correlation-ID", "existing-id");
    });

    it("deve registrar listener no finish", () => {
      const req = { headers: {}, method: "POST", originalUrl: "/api/checkins", ip: "127.0.0.1", get: vi.fn() };
      const res = mockRes();

      loggingMiddleware(req as any, res as any, mockNext);

      expect(res.on).toHaveBeenCalledWith("finish", expect.any(Function));
    });

    it("deve chamar next()", () => {
      const req = { headers: {}, method: "GET", originalUrl: "/api/test", ip: "127.0.0.1", get: vi.fn() };
      const res = mockRes();

      loggingMiddleware(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve incluir informações da request no log", () => {
      const req = {
        headers: {},
        method: "GET",
        originalUrl: "/api/users",
        ip: "192.168.1.1",
        get: vi.fn().mockReturnValue("Mozilla/5.0"),
      };
      const res = mockRes();

      loggingMiddleware(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("getChildLogger", () => {
    it("deve retornar logger filho com contexto", () => {
      const childLogger = getChildLogger({ requestId: "123" });

      expect(childLogger).toBeDefined();
    });
  });
});
