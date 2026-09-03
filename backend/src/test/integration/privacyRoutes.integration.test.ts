import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { prisma } from "../../database/prisma.js";
import {
  createTestCompany,
  cleanupTestData,
  type TestDataContext,
} from "../helpers/authHelper.js";

const app = createTestApp();

describe("privacyRoutes (integração)", () => {
  let ctx: TestDataContext;

  beforeAll(async () => {
    ctx = await createTestCompany(prisma, "privacy-int");
  });

  afterAll(async () => {
    await cleanupTestData(prisma, ctx.companyId);
  });

  describe("GET /privacy/my-data", () => {
    it("deve retornar dados pessoais do titular", async () => {
      const res = await request(app)
        .get("/privacy/my-data")
        .set("Authorization", `Bearer ${ctx.employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("dadosPessoais");
      expect(res.body).toHaveProperty("dadosBiometricos");
      expect(res.body).toHaveProperty("registrosPonto");
      expect(res.body).toHaveProperty("consentimentos");
      expect(res.body.dadosPessoais.nome).toBe("Employee Teste");
      expect(res.body.dadosPessoais.email).toBe(ctx.employeeEmail);
    });

    it("deve retornar 401 sem auth", async () => {
      const res = await request(app).get("/privacy/my-data");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /privacy/export", () => {
    it("deve retornar dados em formato portável JSON", async () => {
      const res = await request(app)
        .get("/privacy/export")
        .set("Authorization", `Bearer ${ctx.employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("meta");
      expect(res.body).toHaveProperty("dadosPessoais");
      expect(res.body).toHaveProperty("registrosPonto");
      expect(res.body).toHaveProperty("consentimentos");
      expect(res.body.meta.fonte).toContain("Ponto Fragata");
    });
  });

  describe("PUT /privacy/my-data", () => {
    it("deve atualizar nome do titular", async () => {
      const res = await request(app)
        .put("/privacy/my-data")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ name: "Employee Atualizado" });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("Employee Atualizado");

      await prisma.user.update({
        where: { id: ctx.employeeId },
        data: { name: "Employee Teste" },
      });
    });

    it("deve retornar 400 sem campos para atualizar", async () => {
      const res = await request(app)
        .put("/privacy/my-data")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("GET /privacy/my-logs", () => {
    it("deve retornar logs de auditoria do usuário", async () => {
      const res = await request(app)
        .get("/privacy/my-logs")
        .set("Authorization", `Bearer ${ctx.employeeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });
  });
});
