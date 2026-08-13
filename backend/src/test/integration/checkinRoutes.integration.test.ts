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

describe("checkinRoutes (integração)", () => {
  let ctx: TestDataContext;

  beforeAll(async () => {
    ctx = await createTestCompany(prisma, "checkin-int");
  });

  afterAll(async () => {
    await cleanupTestData(prisma, ctx.companyId);
  });

  describe("POST /checkins", () => {
    it("deve criar checkin ENTRY com comprovante e NSR", async () => {
      const res = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ type: "ENTRY", latitude: -23.5505, longitude: -46.6333 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("comprovante");
      expect(res.body).toHaveProperty("hashVerificacao");
      expect(res.body.checkin.checkin).toHaveProperty("nsr");
      expect(res.body.checkin.checkin.nsr).toBe(1);
    });

    it("deve bloquear ENTRY duplicada no mesmo dia", async () => {
      const res = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ type: "ENTRY", latitude: -23.5505, longitude: -46.6333 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("já registrado hoje");
    });

    it("deve criar LUNCH_START com NSR sequencial", async () => {
      const res = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ type: "LUNCH_START", latitude: -23.5505, longitude: -46.6333 });

      expect(res.status).toBe(201);
      expect(res.body.checkin.checkin.nsr).toBe(2);
    });

    it("deve criar LUNCH_END com NSR=3", async () => {
      const res = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ type: "LUNCH_END", latitude: -23.5505, longitude: -46.6333 });

      expect(res.status).toBe(201);
      expect(res.body.checkin.checkin.nsr).toBe(3);
    });

    it("deve criar EXIT com NSR=4", async () => {
      const res = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ type: "EXIT", latitude: -23.5505, longitude: -46.6333 });

      expect(res.status).toBe(201);
      expect(res.body.checkin.checkin.nsr).toBe(4);
    });

    it("deve retornar 401 sem auth", async () => {
      const res = await request(app)
        .post("/checkins")
        .send({ type: "ENTRY", latitude: -23.5505, longitude: -46.6333 });

      expect(res.status).toBe(401);
    });

    it("deve retornar 400 com tipo inválido", async () => {
      const res = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ type: "INVALID", latitude: -23.5505, longitude: -46.6333 });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /checkins/", () => {
    it("deve listar checkins do usuário autenticado", async () => {
      const res = await request(app)
        .get("/checkins/")
        .set("Authorization", `Bearer ${ctx.employeeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);
    });
  });

  describe("GET /checkins/company", () => {
    it("deve listar checkins da empresa (admin)", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .get("/checkins/company")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .query({ date: today });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].employeeName).toBe("Employee Teste");
      expect(res.body[0].checkins.length).toBe(4);
    });
  });

  describe("GET /checkins/export/afd", () => {
    it("deve gerar AFD válido no formato MTE", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .get("/checkins/export/afd")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .query({ startDate: today, endDate: today });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/plain");

      const lines = res.text.split("\n");
      expect(lines[0]).toMatch(/^1\|/);
      expect(lines[lines.length - 1]).toMatch(/^9\|/);

      const detailLines = lines.filter((l: string) => l.startsWith("2|"));
      expect(detailLines.length).toBe(4);
    });
  });

  describe("GET /checkins/export/relatorio-mensal", () => {
    it("deve gerar relatório mensal com hash SHA-256", async () => {
      const now = new Date();
      const res = await request(app)
        .get("/checkins/export/relatorio-mensal")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .query({ year: now.getFullYear(), month: now.getMonth() + 1 });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.text).toContain("HASH:");
    });

    it("deve gerar relatório mensal em PDF quando format=pdf", async () => {
      const now = new Date();
      const res = await request(app)
        .get("/checkins/export/relatorio-mensal")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .query({ year: now.getFullYear(), month: now.getMonth() + 1, format: "pdf" });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
    });
  });
});
