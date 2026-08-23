import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  pageView: { create: vi.fn(), count: vi.fn() },
  analyticsEvent: { create: vi.fn(), count: vi.fn() },
  $queryRaw: vi.fn(),
}));

vi.mock("../../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

import { MetricsController } from "../../../controller/MetricsController.js";

describe("MetricsController", () => {
  let controller: MetricsController;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MetricsController();
    mockPrisma.pageView.create.mockResolvedValue({ id: "pv-1" });
    mockPrisma.analyticsEvent.create.mockResolvedValue({ id: "ev-1" });
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      appendHeader: vi.fn(),
      setHeader: vi.fn(),
    };
  });

  describe("track", () => {
    it("deve criar PageView e retornar 201 com visitorId", async () => {
      req = {
        body: { path: "/page", referrer: "https://google.com", utmSource: "google" },
        headers: {},
        ip: "1.2.3.4",
        socket: { remoteAddress: "1.2.3.4" },
      };

      await controller.track(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ visitorId: expect.any(String) }));
      expect(mockPrisma.pageView.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ path: "/page", visitorId: expect.any(String) }),
        })
      );
      expect(res.appendHeader).toHaveBeenCalledWith("Set-Cookie", expect.stringContaining("vid="));
    });

    it("deve reutilizar vid do cookie", async () => {
      req = {
        body: { path: "/page" },
        headers: { cookie: "vid=cookie-vid-123; other=abc", "user-agent": "Mozilla" },
        ip: "1.2.3.4",
        socket: { remoteAddress: "1.2.3.4" },
      };

      await controller.track(req, res);

      expect(mockPrisma.pageView.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ visitorId: "cookie-vid-123" }) })
      );
      // não deve setar cookie quando já existe
      expect(res.appendHeader).not.toHaveBeenCalled();
    });

    it("deve usar visitorId do body quando sem cookie", async () => {
      req = {
        body: { path: "/page", visitorId: "body-vid-xyz" },
        headers: {},
        ip: "1.2.3.4",
        socket: { remoteAddress: "1.2.3.4" },
      };

      await controller.track(req, res);

      expect(mockPrisma.pageView.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ visitorId: "body-vid-xyz" }) })
      );
      expect(res.appendHeader).toHaveBeenCalledWith("Set-Cookie", expect.stringContaining("body-vid-xyz"));
    });

    it("deve retornar 400 para path inválido", async () => {
      req = { body: {}, headers: {}, ip: "1.2.3.4", socket: {} };

      await controller.track(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockPrisma.pageView.create).not.toHaveBeenCalled();
    });

    it("deve hashear ip+ua quando sem vid (LGPD - não armazena IP cru)", async () => {
      req = {
        body: { path: "/page" },
        headers: { "user-agent": "TestAgent/1.0" },
        ip: "5.6.7.8",
        socket: { remoteAddress: "5.6.7.8" },
      };

      await controller.track(req, res);

      const call = mockPrisma.pageView.create.mock.calls[0]![0];
      const vid: string = call.data.visitorId;
      // deve ser hash com prefixo h_
      expect(vid.startsWith("h_")).toBe(true);
      expect(vid.length).toBe(34); // h_ + 32 hex
      // não deve conter IP cru
      expect(vid).not.toContain("5.6.7.8");
    });
  });

  describe("trackEvent", () => {
    it("deve criar AnalyticsEvent para cta_click", async () => {
      req = {
        body: { name: "cta_click", props: { ctaId: "hero-comecar-trial" } },
        headers: { cookie: "vid=vid-123" },
        ip: "1.2.3.4",
        socket: {},
      };

      await controller.trackEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "cta_click", visitorId: "vid-123" }),
        })
      );
    });

    it("deve criar signup_view sem visitorId (gera novo)", async () => {
      req = {
        body: { name: "signup_view" },
        headers: {},
        ip: "1.2.3.4",
        socket: {},
      };

      await controller.trackEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: "signup_view" }) })
      );
      expect(res.appendHeader).toHaveBeenCalled();
    });

    it("deve criar signup_success com companyId", async () => {
      const companyId = "550e8400-e29b-41d4-a716-446655440001";
      req = {
        body: { name: "signup_success", props: { path: "/company/signup" }, companyId, visitorId: "vid-abc" },
        headers: {},
        ip: "1.2.3.4",
        socket: {},
      };

      await controller.trackEvent(req, res);

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "signup_success", companyId, visitorId: "vid-abc" }),
        })
      );
    });

    it("deve retornar 400 para name inválido", async () => {
      req = { body: { name: "invalid_event" }, headers: {}, ip: "1.2.3.4", socket: {} };

      await controller.trackEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockPrisma.analyticsEvent.create).not.toHaveBeenCalled();
    });

    it("deve aceitar companyId null e não vazar IP", async () => {
      req = {
        body: { name: "cta_click", props: { ctaId: "footer" } },
        headers: { "user-agent": "UA" },
        ip: "9.9.9.9",
        socket: { remoteAddress: "9.9.9.9" },
      };

      await controller.trackEvent(req, res);

      const call = mockPrisma.analyticsEvent.create.mock.calls[0]![0];
      expect(call.data.companyId).toBeNull();
      // visitorId não deve conter IP
      expect(String(call.data.visitorId)).not.toContain("9.9.9.9");
    });
  });
});
