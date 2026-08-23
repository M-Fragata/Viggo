export interface TrackPageViewData {
  path: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  visitorId: string;
  userAgent?: string | null;
  country?: string | null;
}

export interface TrackEventData {
  name: string;
  props?: Record<string, unknown> | null;
  visitorId?: string | null;
  companyId?: string | null;
  userId?: string | null;
}

export interface MetricsProvider {
  trackPageView(data: TrackPageViewData): Promise<{ id: string }>;
  trackEvent(data: TrackEventData): Promise<{ id: string }>;
}
