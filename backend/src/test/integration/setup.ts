/// <reference types="node" />
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { afterAll, vi } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, "../../../.env") });

process.env.NODE_ENV = "TEST";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-key-for-testing-only";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
process.env.PORT = process.env.PORT ?? "3334";
process.env.CPF_ENCRYPTION_KEY =
  process.env.CPF_ENCRYPTION_KEY ?? "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
process.env.FACE_ENCRYPTION_KEY =
  process.env.FACE_ENCRYPTION_KEY ?? "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
process.env.ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? "test-asaas-key";
process.env.ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT ?? "sandbox";
process.env.ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN ?? "test-webhook-token";

vi.mock("../../utils/logger.ts", () => ({
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
