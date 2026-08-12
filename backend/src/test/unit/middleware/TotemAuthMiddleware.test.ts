import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

vi.mock("../../../database/prisma-extensions.js", () => ({
  prismaContextStore: {
    run: vi.fn((_store: unknown, callback: () => void) => callback()),
  },
}));

vi.mock("../../../utils/environment.js", () => ({
  Env: { JWT_SECRET: "test-secret-key-for-testing" },
}));

import { totemAuthMiddleware } from "../../../middleware/TotemAuthMiddleware.js";
import { prismaContextStore } from "../../../database/prisma-extensions.js";

const JWT_SECRET = "test-secret-key-for-testing";

function makeTotemToken(companyId: string, overrides: Record<string, unknown> = {}): string {
  return jwt.sign({ companyId, totem: true, ...overrides }, JWT_SECRET, {
    expiresIn: "1h",
    algorithm: "HS256",
  });
}

function makeUserToken(companyId: string): string {
  return jwt.sign(
    { id: "user-1", role: "EMPLOYEE", companyId },
    JWT_SECRET,
    { expiresIn: "1h", algorithm: "HS256" }
  );
}

describe("totemAuthMiddleware", () => {
  let req: any;
  let res: any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next.mockReset();
  });

  it("deve permitir acesso com token totem válido e definir totemContext", () => {
    req.headers.authorization = `Bearer ${makeTotemToken("company-1")}`;

    totemAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.totemContext).toEqual({ companyId: "company-1" });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("deve rejeitar quando não há header de autorização", () => {
    totemAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Token de totem não fornecido" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("deve rejeitar quando header não tem token", () => {
    req.headers.authorization = "Bearer";

    totemAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve rejeitar token de usuário comum (sem claim totem)", () => {
    req.headers.authorization = `Bearer ${makeUserToken("company-1")}`;

    totemAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Token inválido para modo totem" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("deve rejeitar token totem sem companyId", () => {
    req.headers.authorization = `Bearer ${makeTotemToken("company-1", { companyId: undefined })}`;

    totemAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve rejeitar token com assinatura inválida", () => {
    const tampered = makeTotemToken("company-1").slice(0, -4) + "abcd";

    req.headers.authorization = `Bearer ${tampered}`;

    totemAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Token de totem inválido ou expirado" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("deve rejeitar token expirado", () => {
    const expired = jwt.sign(
      { companyId: "company-1", totem: true },
      JWT_SECRET,
      { expiresIn: "0s", algorithm: "HS256" }
    );

    req.headers.authorization = `Bearer ${expired}`;

    totemAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve executar prismaContextStore com companyId e userId totem", () => {
    req.headers.authorization = `Bearer ${makeTotemToken("company-1")}`;

    totemAuthMiddleware(req, res, next);

    expect(prismaContextStore.run).toHaveBeenCalledWith(
      { companyId: "company-1", userId: "totem" },
      expect.any(Function)
    );
  });

  it("não deve permitir que token totem de uma empresa acesse outra", () => {
    req.headers.authorization = `Bearer ${makeTotemToken("company-1")}`;

    totemAuthMiddleware(req, res, next);

    expect(req.totemContext.companyId).toBe("company-1");
    expect(req.totemContext.companyId).not.toBe("company-2");
  });
});
