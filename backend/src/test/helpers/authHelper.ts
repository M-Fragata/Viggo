import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-for-testing-only";

export interface MockTokenPayload {
  id: string;
  role: "MASTER" | "ENTERPRISE_ADMIN" | "EMPLOYEE";
  companyId: string;
  planTier?: string;
  isMaster?: boolean;
}

export function generateMockToken(payload: MockTokenPayload): string {
  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
      companyId: payload.companyId,
      planTier: payload.planTier ?? "DYNAMIC",
      isMaster: payload.isMaster ?? payload.role === "MASTER",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export const MOCK_COMPANY_ID = "test-company-00000000-0000-0000-0000-000000000001";

export const MOCK_USERS = {
  master: {
    id: "test-master-00000000-0000-0000-0000-000000000001",
    role: "MASTER" as const,
    companyId: MOCK_COMPANY_ID,
    isMaster: true,
    name: "Master Teste",
    email: "master@test.com",
  },
  admin: {
    id: "test-admin-00000000-0000-0000-0000-000000000001",
    role: "ENTERPRISE_ADMIN" as const,
    companyId: MOCK_COMPANY_ID,
    isMaster: false,
    name: "Admin Teste",
    email: "admin@test.com",
  },
  employee: {
    id: "test-employee-00000000-0000-0000-0000-000000000001",
    role: "EMPLOYEE" as const,
    companyId: MOCK_COMPANY_ID,
    isMaster: false,
    name: "Employee Teste",
    email: "employee@test.com",
  },
};

export const MOCK_TOKENS = {
  master: generateMockToken(MOCK_USERS.master),
  admin: generateMockToken(MOCK_USERS.admin),
  employee: generateMockToken(MOCK_USERS.employee),
};

export function generateExpiredToken(payload: MockTokenPayload): string {
  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
      companyId: payload.companyId,
      planTier: payload.planTier ?? "DYNAMIC",
      isMaster: payload.isMaster ?? payload.role === "MASTER",
    },
    JWT_SECRET,
    { expiresIn: "0s" }
  );
}

export function generateInvalidToken(): string {
  return jwt.sign(
    { id: "invalid", role: "EMPLOYEE", companyId: "invalid" },
    "wrong-secret-key",
    { expiresIn: "1h" }
  );
}
