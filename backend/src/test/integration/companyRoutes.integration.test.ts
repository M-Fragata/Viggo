import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { prisma } from "../../database/prisma.js";
import {
  createTestCompany,
  cleanupTestData,
  generateMockToken,
  type TestDataContext,
} from "../helpers/authHelper.js";

const app = createTestApp();

describe("companyRoutes (integração)", () => {
  let ctx: TestDataContext;

  beforeAll(async () => {
    ctx = await createTestCompany(prisma, "company-int");
  });

  afterAll(async () => {
    await cleanupTestData(prisma, ctx.companyId);
  });

  describe("POST /companies/signup", () => {
    it("deve criar empresa + admin + subscription + consentimentos", async () => {
      const ts = Date.now();
      const uniqueEmail = `signup-int-${ts}@test.com`;
      const uniqueCnpj = `33445566${String(ts).slice(-4)}000155`;

      const res = await request(app)
        .post("/companies/signup")
        .send({
          name: "Admin Signup Test",
          email: uniqueEmail,
          cpf: "529.982.247-25",
          cnpj: uniqueCnpj,
          companyName: "Empresa Signup Test",
          password: "TestPassword123!",
          confirmPassword: "TestPassword123!",
          aceiteTermos: true,
          aceiteDpa: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.role).toBe("ENTERPRISE_ADMIN");
      expect(res.body.company.status).toBe("TRIAL");

      const consents = await prisma.consentimento.findMany({
        where: { userId: res.body.user.id },
      });
      expect(consents.length).toBeGreaterThanOrEqual(3);

      await prisma.checkIn.deleteMany({
        where: { companyId: res.body.company.id },
      });
      await prisma.subscription.deleteMany({
        where: { companyId: res.body.company.id },
      });
      await prisma.user.deleteMany({
        where: { companyId: res.body.company.id },
      });
      await prisma.company.delete({ where: { id: res.body.company.id } });
    });

    it("deve rejeitar signup com senhas diferentes", async () => {
      const res = await request(app)
        .post("/companies/signup")
        .send({
          name: "Admin Test",
          email: `mismatch-${Date.now()}@test.com`,
          cpf: "529.982.247-25",
          cnpj: `11223344${Date.now().toString().slice(-4)}81`,
          companyName: "Empresa Test",
          password: "TestPassword123!",
          confirmPassword: "DifferentPassword!",
          aceiteTermos: true,
          aceiteDpa: true,
        });

      expect(res.status).toBe(400);
    });

    it("deve rejeitar signup sem aceite de termos", async () => {
      const res = await request(app)
        .post("/companies/signup")
        .send({
          name: "Admin Test",
          email: `noaceite-${Date.now()}@test.com`,
          cpf: "529.982.247-25",
          cnpj: `11223344${Date.now().toString().slice(-4)}81`,
          companyName: "Empresa Test",
          password: "TestPassword123!",
          confirmPassword: "TestPassword123!",
          aceiteTermos: false,
          aceiteDpa: true,
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /companies/me", () => {
    it("deve retornar dados da empresa autenticada", async () => {
      const res = await request(app)
        .get("/companies/me")
        .set("Authorization", `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ctx.companyId);
      expect(res.body.name).toBe(ctx.companyName);
      expect(res.body).toHaveProperty("plan");
      expect(res.body).toHaveProperty("status");
    });

    it("deve retornar 401 sem token", async () => {
      const res = await request(app).get("/companies/me");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /companies/me", () => {
    it("deve atualizar nome da empresa (admin)", async () => {
      const res = await request(app)
        .put("/companies/me")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ name: "Empresa Atualizada" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Empresa Atualizada");

      await prisma.company.update({
        where: { id: ctx.companyId },
        data: { name: ctx.companyName },
      });
    });

    it("deve retornar 403 para employee", async () => {
      const res = await request(app)
        .put("/companies/me")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ name: "Tentativa" });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /companies/me/usage", () => {
    it("deve retornar uso da empresa", async () => {
      const res = await request(app)
        .get("/companies/me/usage")
        .set("Authorization", `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("employees");
      expect(res.body).toHaveProperty("checkins");
      expect(res.body.employees.current).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Convites", () => {
    let inviteToken: string;

    it("POST /companies/me/invite-token → deve criar token", async () => {
      const res = await request(app)
        .post("/companies/me/invite-token")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ expiresInDays: 7, maxUses: 5 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.maxUses).toBe(5);
      inviteToken = res.body.token;
    });

    it("GET /companies/invites/:token → deve retornar dados do convite", async () => {
      const res = await request(app)
        .get(`/companies/invites/${inviteToken}`);

      expect(res.status).toBe(200);
      expect(res.body.company.name).toBe(ctx.companyName);
    });

    it("POST /companies/invites/accept → deve criar employee com consentimentos", async () => {
      const uniqueEmail = `invite-accept-${Date.now()}@test.com`;
      const res = await request(app)
        .post("/companies/invites/accept")
        .send({
          token: inviteToken,
          email: uniqueEmail,
          name: "Employee Convite",
          password: "TestPassword123!",
          confirmPassword: "TestPassword123!",
          aceiteTermos: true,
          aceiteBiometria: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe("EMPLOYEE");
      expect(res.body.user.companyId).toBe(ctx.companyId);
      expect(res.body).toHaveProperty("token");
    });

    it("deve rejeitar convite com email duplicado", async () => {
      const uniqueEmail = `dup-invite-${Date.now()}@test.com`;

      await request(app)
        .post("/companies/invites/accept")
        .send({
          token: inviteToken,
          email: uniqueEmail,
          name: "Primeiro",
          password: "TestPassword123!",
          confirmPassword: "TestPassword123!",
          aceiteTermos: true,
          aceiteBiometria: true,
        });

      const res = await request(app)
        .post("/companies/invites/accept")
        .send({
          token: inviteToken,
          email: uniqueEmail,
          name: "Segundo",
          password: "TestPassword123!",
          confirmPassword: "TestPassword123!",
          aceiteTermos: true,
          aceiteBiometria: true,
        });

      expect(res.status).toBe(400);
    });
  });
});
