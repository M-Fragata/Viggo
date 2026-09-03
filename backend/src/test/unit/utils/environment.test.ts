import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("environment", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("deve exportar objeto Env com variáveis válidas", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "TEST";

    const { Env } = await import("../../../utils/environment.js");

    expect(Env).toBeDefined();
    expect(Env.DATABASE_URL).toBe("postgresql://test:test@localhost:5432/fragata_test");
    expect(Env.JWT_SECRET).toBe("test-secret");
    expect(Env.FRONTEND_URL).toBe("http://localhost:3000");
    expect(Env.CPF_ENCRYPTION_KEY).toBe("a".repeat(64));
    expect(Env.FACE_ENCRYPTION_KEY).toBe("b".repeat(64));
    expect(Env.NODE_ENV).toBe("TEST");
  });

  it("deve ter PORT com valor padrão 3333", async () => {
    delete process.env.PORT;
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "TEST";

    const { Env } = await import("../../../utils/environment.js");

    expect(Env.PORT).toBe(3333);
  });

  it("deve aceitar NODE_ENV = DEV", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "DEV";

    const { Env } = await import("../../../utils/environment.js");

    expect(Env.NODE_ENV).toBe("DEV");
  });

  it("deve aceitar NODE_ENV = PROD", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "PROD";

    const { Env } = await import("../../../utils/environment.js");

    expect(Env.NODE_ENV).toBe("PROD");
  });

  it("deve ter ASAAS_ENVIRONMENT com default 'sandbox'", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "TEST";
    delete process.env.ASAAS_ENVIRONMENT;

    const { Env } = await import("../../../utils/environment.js");

    expect(Env.ASAAS_ENVIRONMENT).toBe("sandbox");
  });

  it("deve rejeitar CPF_ENCRYPTION_KEY com tamanho inválido", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "short-key";
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "TEST";

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("../../../utils/environment.js")).rejects.toThrow();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Erro na validação das variáveis de ambiente")
    );
    spy.mockRestore();
  });

  it("deve rejeitar FACE_ENCRYPTION_KEY com caracteres inválidos", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "g".repeat(64); // 'g' não é hex
    process.env.NODE_ENV = "TEST";

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("../../../utils/environment.js")).rejects.toThrow();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Erro na validação das variáveis de ambiente")
    );
    spy.mockRestore();
  });

  it("deve rejeitar NODE_ENV inválido", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "INVALID";

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("../../../utils/environment.js")).rejects.toThrow();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Erro na validação das variáveis de ambiente")
    );
    spy.mockRestore();
  });

  it("deve rejeitar quando DATABASE_URL está faltando", async () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "TEST";

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("../../../utils/environment.js")).rejects.toThrow();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Erro na validação das variáveis de ambiente")
    );
    spy.mockRestore();
  });

  it("deve rejeitar quando JWT_SECRET está faltando", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/fragata_test";
    delete process.env.JWT_SECRET;
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
    process.env.FACE_ENCRYPTION_KEY = "b".repeat(64);
    process.env.NODE_ENV = "TEST";

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("../../../utils/environment.js")).rejects.toThrow();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Erro na validação das variáveis de ambiente")
    );
    spy.mockRestore();
  });
});
