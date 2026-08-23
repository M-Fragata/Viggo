import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  pageView: { create: vi.fn() },
  analyticsEvent: { create: vi.fn() },
}));

vi.mock("../../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

import { PrismaMetricsProvider } from "../../../services/metrics/prismaMetricsProvider.js";

describe("PrismaMetricsProvider", () => {
  let provider: PrismaMetricsProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new PrismaMetricsProvider();
    mockPrisma.pageView.create.mockResolvedValue({ id: "pv-1" });
    mockPrisma.analyticsEvent.create.mockResolvedValue({ id: "ev-1" });
  });

  it("deve criar PageView com todos os campos", async () => {
    const res = await provider.trackPageView({
      path: "/page",
      visitorId: "vid-123",
      referrer: "https://google.com",
      utmSource: "google",
      userAgent: "UA",
      country: null,
    });

    expect(res).toEqual({ id: "pv-1" });
    expect(mockPrisma.pageView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ path: "/page", visitorId: "vid-123", utmSource: "google" }),
      })
    );
  });

  it("deve criar AnalyticsEvent com props e visitorId", async () => {
    const res = await provider.trackEvent({
      name: "cta_click",
      visitorId: "vid-123",
      props: { ctaId: "hero" },
    });

    expect(res).toEqual({ id: "ev-1" });
    expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "cta_click", visitorId: "vid-123" }),
      })
    );
  });

  it("deve tolerar props null", async () => {
    await provider.trackEvent({ name: "signup_view", visitorId: "vid-123", props: null });
    expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ props: null }) })
    );
  });

  it("não deve vazar IP — visitorId já hasheado", async () => {
    await provider.trackPageView({ path: "/page", visitorId: "h_abc123hash", referrer: null, utmSource: null, userAgent: null, country: null });
    const data = mockPrisma.pageView.create.mock.calls[0]![0].data;
    expect(data.visitorId).toBe("h_abc123hash");
    expect(JSON.stringify(data)).not.toContain("192.168");
  });
});
