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

describe("sessionRoutes (integração)", () => {
  let ctx: TestDataContext;
  let otherCtx: TestDataContext;

  beforeAll(async () => {
    ctx = await createTestCompany(prisma, "session-int");
    otherCtx = await createTestCompany(prisma, "session-other");
  });

  afterAll(async () => {
    await cleanupTestData(prisma, otherCtx.companyId);
    await cleanupTestData(prisma, ctx.companyId);
  });

  describe("POST /sessions/login", () => {
    it("deve retornar JWT com credenciais válidas", async () => {
      const res = await request(app)
        .post("/sessions/login")
        .send({
          email: ctx.adminEmail,
          password: "TestPassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe(ctx.adminEmail);
      expect(res.body.user.role).toBe("ENTERPRISE_ADMIN");
    });

    it("deve retornar 400 com senha errada", async () => {
      const res = await request(app)
        .post("/sessions/login")
        .send({
          email: ctx.adminEmail,
          password: "WrongPassword123!",
        });

      expect(res.status).toBe(400);
    });

    it("deve retornar 400 com email inexistente", async () => {
      const res = await request(app)
        .post("/sessions/login")
        .send({
          email: "nonexistent@test.com",
          password: "TestPassword123!",
        });

      expect(res.status).toBe(400);
    });

    it("deve retornar 400 com dados inválidos", async () => {
      const res = await request(app)
        .post("/sessions/login")
        .send({
          email: "invalid-email",
          password: "123",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /sessions/:userId (face update)", () => {
    it("deve atualizar face descriptor do próprio usuário", async () => {
      const res = await request(app)
        .put(`/sessions/${ctx.employeeId}`)
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ faceDescriptor: new Array(128).fill(0.5) });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("sucesso");
    });

    it("deve retornar 404 para IDOR cross-company", async () => {
      const res = await request(app)
        .put(`/sessions/${otherCtx.employeeId}`)
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ faceDescriptor: new Array(128).fill(0.5) });

      expect(res.status).toBe(404);
    });

    it("deve retornar 401 sem auth", async () => {
      const res = await request(app)
        .put(`/sessions/${ctx.employeeId}`)
        .send({ faceDescriptor: new Array(128).fill(0.5) });

      expect(res.status).toBe(401);
    });

    it("deve retornar 400 com faceDescriptor inválido", async () => {
      const res = await request(app)
        .put(`/sessions/${ctx.employeeId}`)
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ faceDescriptor: "not-an-array" });

      expect(res.status).toBe(400);
    });
  });
});
