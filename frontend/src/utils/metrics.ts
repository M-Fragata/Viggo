import { API_URL } from "./api";

const STORAGE_KEY = "viggo:vid";
const SESSION_PREFIX = "viggo:metrics:session:";

function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.trim().length > 0) return existing.trim();
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
  for (const k of keys) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  return out;
}

function shouldTrack(path: string): boolean {
  try {
    const key = `${SESSION_PREFIX}${path}`;
    const last = sessionStorage.getItem(key);
    if (last) {
      const ts = Number(last);
      // 30 min debounce per path
      if (!Number.isNaN(ts) && Date.now() - ts < 30 * 60 * 1000) return false;
    }
    sessionStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

function buildTrackPayload(path: string) {
  const utm = getUtmParams();
  return {
    path,
    referrer: document.referrer || null,
    utmSource: utm.utm_source || null,
    utmMedium: utm.utm_medium || null,
    utmCampaign: utm.utm_campaign || null,
    utmTerm: utm.utm_term || null,
    utmContent: utm.utm_content || null,
    visitorId: getVisitorId(),
  };
}

export function trackPageView(path: string): void {
  if (typeof window === "undefined" || !API_URL) return;
  if (!shouldTrack(path)) return;

  const payload = buildTrackPayload(path);
  const url = `${API_URL}/metrics/track`;
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    // fallback to fetch
  }

  // keepalive fetch — não bloqueia unload
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackEvent(
  name: "cta_click" | "signup_view" | "signup_success",
  props?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !API_URL) return;

  const companyId = props && typeof props["companyId"] === "string" ? (props["companyId"] as string) : null;
  const userId = props && typeof props["userId"] === "string" ? (props["userId"] as string) : null;
  const payload = {
    name,
    props: props ?? null,
    visitorId: getVisitorId(),
    companyId,
    userId,
  };

  const url = `${API_URL}/metrics/event`;
  const body = JSON.stringify(payload);

  // eventos são pequenos — fetch keepalive é suficiente
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export { getVisitorId };
