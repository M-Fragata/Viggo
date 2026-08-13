import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { prisma } from "../../database/prisma.js";
import {
  createTestCompany,
  cleanupTestData,
  type TestDataContext,
} from "../helpers/authHelper.js";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { encryptFaceDescriptor } from "../../utils/faceEncryption.js";
import { encryptCpf, hashCpf } from "../../utils/cpfEncryption.js";

const app = createTestApp();

describe("totemRoutes (integração)", () => {
  let ctx: TestDataContext;
  let totemToken: string;

  beforeAll(async () => {
    ctx = await createTestCompany(prisma, "totem-int");

    const passwordHash = await bcrypt.hash("TestPassword123!", 10);

    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const cpfBase = String(Date.now()).slice(-9).padStart(9, "0");
    const cpfDigits = `${cpfBase}11`;

    await prisma.user.create({
      data: {
        name: "Funcionario Com Face",
        email: `face-${uid}@test.com`,
        password: passwordHash,
        role: "EMPLOYEE",
        companyId: ctx.companyId,
        cpf: encryptCpf(cpfDigits),
        cpfHash: hashCpf(cpfDigits),
        faceDescriptor: encryptFaceDescriptor(new Float32Array(128).fill(0.5)),
      },
    });

    await prisma.user.create({
      data: {
        name: "Funcionario Inativo",
        email: `inactive-${uid}@test.com`,
        password: passwordHash,
        role: "EMPLOYEE",
        companyId: ctx.companyId,
        cpf: null,
        status: "INACTIVE",
      },
    });

    await prisma.user.create({
      data: {
        name: "Funcionario Sem Face",
        email: `noface-${uid}@test.com`,
        password: passwordHash,
        role: "EMPLOYEE",
        companyId: ctx.companyId,
        cpf: null,
        faceDescriptor: Prisma.DbNull,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData(prisma, ctx.companyId);
  });

  async function getFaceEmployee() {
    const faceUser = await prisma.user.findFirst({
      where: { companyId: ctx.companyId, name: "Funcionario Com Face" },
    });
    if (!faceUser) throw new Error("Funcionário com face não encontrado");
    return faceUser;
  }

  async function verifyEmployee(): Promise<string> {
    const faceUser = await getFaceEmployee();
    const res = await request(app)
      .post("/totem/verify")
      .set("Authorization", `Bearer ${totemToken}`)
      .send({ email: faceUser.email, password: "TestPassword123!" });

    expect(res.status).toBe(200);
    return res.body.faceToken as string;
  }

  describe("POST /totem/companies/me/totem/activate", () => {
    it("deve retornar 401 sem autenticação", async () => {
      const res = await request(app)
        .post("/totem/companies/me/totem/activate")
        .send({ pin: "1234" });

      expect(res.status).toBe(401);
    });

    it("deve retornar 403 para funcionário comum", async () => {
      const res = await request(app)
        .post("/totem/companies/me/totem/activate")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ pin: "1234" });

      expect(res.status).toBe(403);
    });

    it("deve retornar 400 com PIN inválido", async () => {
      const res = await request(app)
        .post("/totem/companies/me/totem/activate")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ pin: "12a4" });

      expect(res.status).toBe(400);
    });

    it("deve ativar totem e retornar token (admin)", async () => {
      const res = await request(app)
        .post("/totem/companies/me/totem/activate")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ pin: "123456" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totemToken");
      expect(res.body.expiresIn).toBe(8 * 60 * 60);
      totemToken = res.body.totemToken;

      const company = await prisma.company.findUnique({
        where: { id: ctx.companyId },
        select: { totemActive: true, totemPinHash: true },
      });
      expect(company?.totemActive).toBe(true);
      expect(company?.totemPinHash).toBeTruthy();
    });
  });

  describe("POST /totem/verify", () => {
    it("deve retornar 401 sem token totem", async () => {
      const res = await request(app)
        .post("/totem/verify")
        .send({ email: "x@test.com", password: "TestPassword123!" });

      expect(res.status).toBe(401);
    });

    it("deve retornar 401 com token de usuário comum", async () => {
      const res = await request(app)
        .post("/totem/verify")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ email: "x@test.com", password: "TestPassword123!" });

      expect(res.status).toBe(401);
    });

    it("deve retornar 404 para email de outra empresa", async () => {
      const res = await request(app)
        .post("/totem/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: "nao-existe@test.com", password: "TestPassword123!" });

      expect(res.status).toBe(404);
    });

    it("deve retornar 403 com senha incorreta", async () => {
      const faceUser = await getFaceEmployee();
      const res = await request(app)
        .post("/totem/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: faceUser.email, password: "SenhaErrada123!" });

      expect(res.status).toBe(403);
    });

    it("deve retornar 403 para conta inativa", async () => {
      const inactiveUser = await prisma.user.findFirst({
        where: { companyId: ctx.companyId, name: "Funcionario Inativo" },
      });
      const res = await request(app)
        .post("/totem/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: inactiveUser?.email, password: "TestPassword123!" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("inativa");
    });

    it("deve retornar 403 FACE_NOT_REGISTERED sem face cadastrada", async () => {
      const res = await request(app)
        .post("/totem/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: ctx.employeeEmail, password: "TestPassword123!" });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FACE_NOT_REGISTERED");
      expect(res.body.userId).toBe(ctx.employeeId);
    });

    it("deve emitir faceToken para funcionário com face", async () => {
      const faceUser = await getFaceEmployee();
      const res = await request(app)
        .post("/totem/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: faceUser.email, password: "TestPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("faceToken");
      expect(res.body).toHaveProperty("expiresIn", 30);
      expect(res.body.userId).toBe(faceUser.id);
      expect(res.body.userName).toBe("Funcionario Com Face");
    });
  });

  describe("POST /totem/face/verify", () => {
    it("deve retornar 401 sem token totem", async () => {
      const res = await request(app)
        .post("/totem/face/verify")
        .send({ token: "00000000-0000-4000-8000-000000000000", descriptor: new Array(128).fill(0.5) });

      expect(res.status).toBe(401);
    });

    it("deve retornar 401 com token facial inválido", async () => {
      const res = await request(app)
        .post("/totem/face/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ token: "00000000-0000-4000-8000-000000000000", descriptor: new Array(128).fill(0.5) });

      expect(res.status).toBe(401);
    });

    it("deve confirmar rosto com descriptor idêntico", async () => {
      const faceToken = await verifyEmployee();
      const res = await request(app)
        .post("/totem/face/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ token: faceToken, descriptor: new Array(128).fill(0.5) });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("deve recusar rosto com descriptor diferente", async () => {
      const faceToken = await verifyEmployee();
      const res = await request(app)
        .post("/totem/face/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ token: faceToken, descriptor: new Array(128).fill(1.0) });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });

    it("deve retornar 400 com descriptor de tamanho inválido", async () => {
      const faceToken = await verifyEmployee();
      const res = await request(app)
        .post("/totem/face/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ token: faceToken, descriptor: [1, 2, 3] });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /totem/face/register", () => {
    async function getNoFaceUser() {
      const noFaceUser = await prisma.user.findFirst({
        where: { companyId: ctx.companyId, name: "Funcionario Sem Face" },
      });
      if (!noFaceUser) throw new Error("Funcionário sem face não encontrado");
      return noFaceUser;
    }

    it("deve retornar 401 sem token totem", async () => {
      const res = await request(app)
        .post("/totem/face/register")
        .send({ userId: ctx.employeeId, descriptor: new Array(128).fill(0.5) });

      expect(res.status).toBe(401);
    });

    it("deve retornar 404 para usuário inexistente", async () => {
      const res = await request(app)
        .post("/totem/face/register")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ userId: "00000000-0000-4000-8000-000000000001", descriptor: new Array(128).fill(0.5) });

      expect(res.status).toBe(404);
    });

    it("deve retornar 400 com descriptor de tamanho inválido", async () => {
      const noFaceUser = await getNoFaceUser();
      const res = await request(app)
        .post("/totem/face/register")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ userId: noFaceUser.id, descriptor: [1, 2, 3] });

      expect(res.status).toBe(400);
    });

    it("deve registrar face e liberar o fluxo completo de checkin", async () => {
      const noFaceUser = await getNoFaceUser();

      const verifyBefore = await request(app)
        .post("/totem/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: noFaceUser.email, password: "TestPassword123!" });

      expect(verifyBefore.status).toBe(403);
      expect(verifyBefore.body.code).toBe("FACE_NOT_REGISTERED");
      expect(verifyBefore.body.userId).toBe(noFaceUser.id);

      const registerRes = await request(app)
        .post("/totem/face/register")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ userId: noFaceUser.id, descriptor: new Array(128).fill(0.5) });

      expect(registerRes.status).toBe(200);
      expect(registerRes.body.message).toBe("Face registrada com sucesso!");

      const storedUser = await prisma.user.findUnique({
        where: { id: noFaceUser.id },
        select: { faceDescriptor: true },
      });
      expect(storedUser?.faceDescriptor).toBeTruthy();

      const verifyAfter = await request(app)
        .post("/totem/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: noFaceUser.email, password: "TestPassword123!" });

      expect(verifyAfter.status).toBe(200);
      expect(verifyAfter.body).toHaveProperty("faceToken");

      const faceVerify = await request(app)
        .post("/totem/face/verify")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ token: verifyAfter.body.faceToken, descriptor: new Array(128).fill(0.5) });

      expect(faceVerify.status).toBe(200);
      expect(faceVerify.body.success).toBe(true);
    });
  });

  describe("POST /totem/checkin", () => {
    it("deve retornar 401 sem token totem", async () => {
      const res = await request(app)
        .post("/totem/checkin")
        .send({
          userId: ctx.employeeId,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken: "00000000-0000-4000-8000-000000000000",
        });

      expect(res.status).toBe(401);
    });

    it("deve retornar 401 com faceToken inválido", async () => {
      const res = await request(app)
        .post("/totem/checkin")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({
          userId: ctx.employeeId,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken: "00000000-0000-4000-8000-000000000000",
        });

      expect(res.status).toBe(401);
    });

    it("deve retornar 403 com faceToken de outro usuário", async () => {
      const faceUser = await getFaceEmployee();
      const faceToken = await verifyEmployee();

      const res = await request(app)
        .post("/totem/checkin")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({
          userId: ctx.employeeId,
          type: "ENTRY",
          latitude: -23.55,
          longitude: -46.63,
          faceToken,
        });

      expect(res.status).toBe(403);
      expect(faceUser.id).not.toBe(ctx.employeeId);
    });

    it("deve retornar 400 com type inválido", async () => {
      const faceToken = await verifyEmployee();
      const faceUser = await getFaceEmployee();

      const res = await request(app)
        .post("/totem/checkin")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({
          userId: faceUser.id,
          type: "INVALID",
          latitude: -23.55,
          longitude: -46.63,
          faceToken,
        });

      expect(res.status).toBe(400);
    });

    it("deve registrar checkin com comprovante", async () => {
      const faceUser = await getFaceEmployee();
      const faceToken = await verifyEmployee();

      const res = await request(app)
        .post("/totem/checkin")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({
          userId: faceUser.id,
          type: "ENTRY",
          latitude: -23.5505,
          longitude: -46.6333,
          faceToken,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("comprovante");
      expect(res.body).toHaveProperty("hashVerificacao");
      expect(res.body.checkin.checkin).toHaveProperty("nsr");
    });

    it("deve bloquear checkin duplicado no mesmo dia", async () => {
      const faceUser = await getFaceEmployee();
      const faceToken = await verifyEmployee();

      const res = await request(app)
        .post("/totem/checkin")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({
          userId: faceUser.id,
          type: "ENTRY",
          latitude: -23.5505,
          longitude: -46.6333,
          faceToken,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("já registrado hoje");
    });

    it("não deve reutilizar o mesmo faceToken", async () => {
      const faceUser = await getFaceEmployee();
      const faceToken = await verifyEmployee();

      await request(app)
        .post("/totem/checkin")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({
          userId: faceUser.id,
          type: "LUNCH_START",
          latitude: -23.5505,
          longitude: -46.6333,
          faceToken,
        });

      const res = await request(app)
        .post("/totem/checkin")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({
          userId: faceUser.id,
          type: "LUNCH_START",
          latitude: -23.5505,
          longitude: -46.6333,
          faceToken,
        });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /totem/companies/me/totem/deactivate", () => {
    it("deve retornar 401 sem autenticação", async () => {
      const res = await request(app)
        .post("/totem/companies/me/totem/deactivate")
        .send({ pin: "123456" });

      expect(res.status).toBe(401);
    });

    it("deve retornar 403 para funcionário comum", async () => {
      const res = await request(app)
        .post("/totem/companies/me/totem/deactivate")
        .set("Authorization", `Bearer ${ctx.employeeToken}`)
        .send({ pin: "123456" });

      expect(res.status).toBe(403);
    });

    it("deve retornar 403 com PIN incorreto", async () => {
      const res = await request(app)
        .post("/totem/companies/me/totem/deactivate")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ pin: "000000" });

      expect(res.status).toBe(403);
    });

    it("deve desativar totem com PIN correto", async () => {
      const res = await request(app)
        .post("/totem/companies/me/totem/deactivate")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ pin: "123456" });

      expect(res.status).toBe(200);

      const company = await prisma.company.findUnique({
        where: { id: ctx.companyId },
        select: { totemActive: true },
      });
      expect(company?.totemActive).toBe(false);
    });
  });

  describe("POST /totem/recover", () => {
    it("deve retornar 401 sem token totem", async () => {
      const res = await request(app)
        .post("/totem/recover")
        .send({ email: ctx.adminEmail, password: "TestPassword123!" });

      expect(res.status).toBe(401);
    });

    it("deve retornar 400 com dados inválidos", async () => {
      const res = await request(app)
        .post("/totem/recover")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: "email-invalido", password: "123" });

      expect(res.status).toBe(400);
    });

    it("deve retornar 403 com senha incorreta", async () => {
      const res = await request(app)
        .post("/totem/recover")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: ctx.adminEmail, password: "SenhaErrada123!" });

      expect(res.status).toBe(403);
    });

    it("deve retornar 403 para funcionário comum", async () => {
      const res = await request(app)
        .post("/totem/recover")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: ctx.employeeEmail, password: "TestPassword123!" });

      expect(res.status).toBe(403);
    });

    it("deve retornar 403 para email inexistente", async () => {
      const res = await request(app)
        .post("/totem/recover")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: "nao-existe@test.com", password: "TestPassword123!" });

      expect(res.status).toBe(403);
    });

    it("deve desativar totem com credenciais de admin", async () => {
      await request(app)
        .post("/totem/companies/me/totem/activate")
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ pin: "123456" });

      const res = await request(app)
        .post("/totem/recover")
        .set("Authorization", `Bearer ${totemToken}`)
        .send({ email: ctx.adminEmail, password: "TestPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Modo totem desativado");

      const company = await prisma.company.findUnique({
        where: { id: ctx.companyId },
        select: { totemActive: true },
      });
      expect(company?.totemActive).toBe(false);
    });
  });
});
