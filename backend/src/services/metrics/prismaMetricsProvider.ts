import { prisma } from "../../database/prisma.js";
import type { MetricsProvider, TrackPageViewData, TrackEventData } from "./metricsProvider.js";

export class PrismaMetricsProvider implements MetricsProvider {
  async trackPageView(data: TrackPageViewData): Promise<{ id: string }> {
    const row = await prisma.pageView.create({
      data: {
        path: data.path,
        referrer: data.referrer ?? null,
        utmSource: data.utmSource ?? null,
        utmMedium: data.utmMedium ?? null,
        utmCampaign: data.utmCampaign ?? null,
        utmTerm: data.utmTerm ?? null,
        utmContent: data.utmContent ?? null,
        visitorId: data.visitorId,
        userAgent: data.userAgent ?? null,
        country: data.country ?? null,
      },
      select: { id: true },
    });
    return { id: row.id };
  }

  async trackEvent(data: TrackEventData): Promise<{ id: string }> {
    const row = await prisma.analyticsEvent.create({
      data: {
        name: data.name,
        ...(data.props ? { props: data.props as any } : {}),
        visitorId: data.visitorId ?? null,
        companyId: data.companyId ?? null,
        userId: data.userId ?? null,
      },
      select: { id: true },
    });
    return { id: row.id };
  }
}

let provider: MetricsProvider | null = null;

export function getMetricsProvider(): MetricsProvider {
  if (!provider) provider = new PrismaMetricsProvider();
  return provider;
}

export function setMetricsProvider(p: MetricsProvider) {
  provider = p;
}

export function resetMetricsProvider() {
  provider = null;
}
