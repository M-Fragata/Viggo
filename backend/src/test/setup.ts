/// <reference types="node" />
import { afterAll, vi } from "vitest";

process.env.NODE_ENV = "TEST";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.PORT = "3334";
process.env.CPF_ENCRYPTION_KEY =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
process.env.FACE_ENCRYPTION_KEY =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
process.env.ASAAS_API_KEY = "test-asaas-key";
process.env.ASAAS_ENVIRONMENT = "sandbox";
process.env.ASAAS_WEBHOOK_TOKEN = "test-webhook-token";

vi.mock("../utils/logger.ts", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

afterAll(() => {
  vi.restoreAllMocks();
});
