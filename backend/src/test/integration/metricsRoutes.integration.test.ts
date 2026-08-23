import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockPrisma = vi.hoisted(() => ({
  pageView: { create: vi.fn(), count: vi.fn() },
  analyticsEvent: { create: vi.fn(), count: vi.fn() },
  company: { count: vi.fn(), groupBy: vi.fn() },
  user: { count: vi.fn() },
  checkIn: { count: vi.fn() },
  subscription: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
  $extends: vi.fn().mockReturnThis(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
}));

vi.mock("../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../database/prisma-extensions.js", () => ({
  prismaContextStore: { run: (_store: unknown, cb: () => void) => cb(), getStore: () => ({ companyId: "", userId: "" }) },
  extendedPrisma: mockPrisma,
}));

import { createTestApp } from "../helpers/testApp.js";
import { MOCK_TOKENS } from "../helpers/authHelper.js";

const app = createTestApp();

describe("metricsRoutes (integração)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.pageView.create.mockResolvedValue({ id: "pv-1" });
    mockPrisma.analyticsEvent.create.mockResolvedValue({ id: "ev-1" });
    mockPrisma.company.count.mockResolvedValue(0);
    mockPrisma.company.groupBy.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.checkIn.count.mockResolvedValue(0);
    mockPrisma.subscription.findMany.mockResolvedValue([]);
    mockPrisma.pageView.count.mockResolvedValue(0);
    mockPrisma.analyticsEvent.count.mockResolvedValue(0);
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  describe("POST /metrics/track — público, anônimo na landing", () => {
    it("deve criar PageView e retornar 201 com visitorId e Set-Cookie", async () => {
      const res = await request(app)
        .post("/metrics/track")
        .send({ path: "/page", referrer: "https://google.com", utmSource: "google" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("visitorId");
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"]![0]).toMatch(/vid=/);
      expect(mockPrisma.pageView.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ path: "/page" }) })
      );
      // LGPD: não deve persistir IP cru
      const data = mockPrisma.pageView.create.mock.calls[0]![0].data as Record<string, unknown>;
      expect(JSON.stringify(data)).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    });

    it("deve reutilizar vid do cookie (não seta novo)", async () => {
      const res = await request(app)
        .post("/metrics/track")
        .set("Cookie", "vid=existing-vid-abc")
        .send({ path: "/page" });

      expect(res.status).toBe(201);
      expect(res.body.visitorId).toBe("existing-vid-abc");
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("deve retornar 400 para path inválido", async () => {
      const res = await request(app).post("/metrics/track").send({});
      expect(res.status).toBe(400);
    });

    it("deve respeitar rate limit (não testado em TEST — noop)", async () => {
      const res = await request(app).post("/metrics/track").send({ path: "/page" });
      expect(res.status).toBe(201);
    });
  });

  describe("POST /metrics/event — público", () => {
    it("deve criar AnalyticsEvent cta_click", async () => {
      const res = await request(app)
        .post("/metrics/event")
        .send({ name: "cta_click", props: { ctaId: "hero-comecar-trial" } });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("visitorId");
      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: "cta_click" }) })
      );
    });

    it("deve criar signup_success com companyId", async () => {
      const companyId = "550e8400-e29b-41d4-a716-446655440001";
      const res = await request(app)
        .post("/metrics/event")
        .send({ name: "signup_success", companyId, visitorId: "vid-xyz" });

      expect(res.status).toBe(201);
      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ companyId, visitorId: "vid-xyz" }) })
      );
    });

    it("deve retornar 400 para name inválido", async () => {
      const res = await request(app).post("/metrics/event").send({ name: "invalid" });
      expect(res.status).toBe(400);
    });

    it("LGPD: visitorId não deve conter IP cru após hash", async () => {
      const res = await request(app)
        .post("/metrics/event")
        .set("User-Agent", "Mozilla/5.0")
        .send({ name: "cta_click", props: { ctaId: "footer" } });

      expect(res.status).toBe(201);
      const data = mockPrisma.analyticsEvent.create.mock.calls[0]![0].data as Record<string, unknown>;
      expect(String(data.visitorId)).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    });
  });

  describe("GET /master/metrics — protegido MASTER, diário", () => {
    beforeEach(() => {
      // Mock dados realistas para agregações
      mockPrisma.company.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // active
        .mockResolvedValueOnce(2) // trial
        .mockResolvedValueOnce(1) // suspended
        .mockResolvedValueOnce(0); // cancelled
      mockPrisma.company.groupBy.mockResolvedValue([{ plan: "DYNAMIC", _count: { plan: 10 } }]);
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.checkIn.count
        .mockResolvedValueOnce(200) // thisMonth
        .mockResolvedValueOnce(150); // lastMonth
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      mockPrisma.pageView.count.mockResolvedValue(120);
      mockPrisma.analyticsEvent.count
        .mockResolvedValueOnce(80) // cta_click
        .mockResolvedValueOnce(40); // signup_view
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(80) }]) // uniques
        .mockResolvedValueOnce([{ date: "2026-08-20", views: BigInt(30), uniques: BigInt(20) }]) // byDay
        .mockResolvedValueOnce([{ source: "google", views: BigInt(50), uniques: BigInt(35) }]) // bySource
        .mockResolvedValueOnce([{ date: "2026-08-20", count: BigInt(5) }]); // companies byDay
    });

    it("deve exigir autenticação (401)", async () => {
      const res = await request(app).get("/master/metrics");
      expect(res.status).toBe(401);
    });

    it("deve negar EMPLOYEE (403)", async () => {
      const res = await request(app)
        .get("/master/metrics")
        .set("Authorization", `Bearer ${MOCK_TOKENS.employee}`);
      expect(res.status).toBe(403);
    });

    it("deve retornar métricas com acquisition/conversion/funnel para MASTER", async () => {
      const res = await request(app)
        .get("/master/metrics?from=2026-08-01&to=2026-08-23")
        .set("Authorization", `Bearer ${MOCK_TOKENS.master}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("companies");
      expect(res.body).toHaveProperty("acquisition");
      expect(res.body).toHaveProperty("conversion");
      expect(res.body).toHaveProperty("funnel");
      expect(res.body.acquisition.views).toBe(120);
      expect(res.body.conversion.companiesCreated).toBe(5);
      expect(res.body.funnel).toHaveLength(4);
      expect(res.headers["cache-control"]).toMatch(/private.*max-age=60/);
    });

    it("deve validar query from inválida (400)", async () => {
      const res = await request(app)
        .get("/master/metrics?from=invalid-date")
        .set("Authorization", `Bearer ${MOCK_TOKENS.master}`);
      expect(res.status).toBe(400);
    });

    it("deve retornar taxa de conversão correta (empresas/uniques)", async () => {
      const res = await request(app)
        .get("/master/metrics")
        .set("Authorization", `Bearer ${MOCK_TOKENS.master}`);
      // uniques=80, companies=5 => 6.25%
      expect(res.body.conversion.rate).toBe(6.25);
    });
  });
});
