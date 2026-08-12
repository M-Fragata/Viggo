import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

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

export interface TestDataContext {
  companyId: string;
  companyName: string;
  companyCnpj: string;
  adminId: string;
  adminEmail: string;
  adminToken: string;
  employeeId: string;
  employeeEmail: string;
  employeeToken: string;
}

let testCounter = 0;

function generateUniqueCnpj(): string {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${id.slice(0, 8)}000181`;
}

function generateUniqueCpf(prefix: string): string {
  const id = crypto.randomUUID().replace(/-/g, "");
  const digits = `${prefix}${id}`.slice(0, 9).replace(/\D/g, "").padStart(9, "0");
  const hash = digits.split("").reduce((acc, d) => acc + parseInt(d), 0);
  const d1 = (hash * 7 + 3) % 10;
  const d2 = (hash * 5 + d1 * 3) % 10;
  return `${digits}${d1}${d2}`;
}

export async function createTestCompany(
  prisma: PrismaClient,
  suffix?: string
): Promise<TestDataContext> {
  const ts = suffix ?? `${Date.now()}${++testCounter}`;
  const uniqueCnpj = generateUniqueCnpj();

  const passwordHash = await bcrypt.hash("TestPassword123!", 10);

  const company = await prisma.company.create({
    data: {
      name: `Empresa Test ${ts}`,
      cnpj: uniqueCnpj,
      plan: "DYNAMIC",
      status: "ACTIVE",
      maxEmployees: 10,
      planExpiresAt: new Date("2027-12-31"),
      trialUsed: true,
      settings: {},
    },
  });

  const uid = crypto.randomUUID().slice(0, 8);
  const adminEmail = `admin-${uid}@test.com`;
  const employeeEmail = `employee-${uid}@test.com`;

  const adminCpf = generateUniqueCpf("A");
  const employeeCpf = generateUniqueCpf("B");

  const admin = await prisma.user.create({
    data: {
      name: "Admin Teste",
      email: adminEmail,
      password: passwordHash,
      role: "ENTERPRISE_ADMIN",
      companyId: company.id,
      cpf: adminCpf,
    },
  });

  const employee = await prisma.user.create({
    data: {
      name: "Employee Teste",
      email: employeeEmail,
      password: passwordHash,
      role: "EMPLOYEE",
      companyId: company.id,
      cpf: employeeCpf,
    },
  });

  const adminToken = generateMockToken({
    id: admin.id,
    role: "ENTERPRISE_ADMIN",
    companyId: company.id,
  });

  const employeeToken = generateMockToken({
    id: employee.id,
    role: "EMPLOYEE",
    companyId: company.id,
  });

  return {
    companyId: company.id,
    companyName: company.name,
    companyCnpj: company.cnpj,
    adminId: admin.id,
    adminEmail,
    adminToken,
    employeeId: employee.id,
    employeeEmail,
    employeeToken,
  };
}

export async function cleanupTestData(
  prisma: PrismaClient,
  companyId: string
): Promise<void> {
  await prisma.checkIn.deleteMany({ where: { companyId } });
  await prisma.justificativa.deleteMany({ where: { companyId } });
  await prisma.inviteTokenUsage.deleteMany({
    where: { inviteToken: { companyId } },
  });
  await prisma.inviteToken.deleteMany({ where: { companyId } });
  await prisma.consentimento.deleteMany({
    where: { user: { companyId } },
  });
  await prisma.auditLog.deleteMany({ where: { companyId } });
  await prisma.workSchedule.deleteMany({ where: { companyId } });
  await prisma.subscription.deleteMany({ where: { companyId } });
  await prisma.payment.deleteMany({ where: { companyId } });
  await prisma.user.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } });
}
