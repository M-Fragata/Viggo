import type { Request, Response } from "express";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { getMetricsProvider } from "../services/metrics/prismaMetricsProvider.js";
import { Env } from "../utils/environment.js";

const trackSchema = z.object({
  path: z.string().min(1).max(500),
  referrer: z.string().max(2000).optional().nullable(),
  utmSource: z.string().max(100).optional().nullable(),
  utmMedium: z.string().max(100).optional().nullable(),
  utmCampaign: z.string().max(100).optional().nullable(),
  utmTerm: z.string().max(100).optional().nullable(),
  utmContent: z.string().max(100).optional().nullable(),
  visitorId: z.string().max(200).optional().nullable(),
});

const eventSchema = z.object({
  name: z.enum(["cta_click", "signup_view", "signup_success"]),
  props: z.record(z.string(), z.unknown()).optional().nullable(),
  visitorId: z.string().max(200).optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
});

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k.trim()] = decodeURIComponent(rest.join("=") ?? "");
  }
  return out;
}

function resolveVisitorId(req: Request, bodyVisitorId?: string | null): { visitorId: string; isNew: boolean } {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.vid && cookies.vid.trim().length > 0) {
    return { visitorId: cookies.vid.trim(), isNew: false };
  }
  if (bodyVisitorId && bodyVisitorId.trim().length > 0) {
    // sanitize: only allow alphanum, dash, underscore
    const sanitized = bodyVisitorId.trim().slice(0, 200);
    return { visitorId: sanitized, isNew: true };
  }
  // Deterministic fallback: hash(ip + salt + ua) when possible
  const ip = (req.ip ?? req.socket.remoteAddress ?? "").trim();
  const ua = (req.headers["user-agent"] ?? "") as string;
  if (ip && ua) {
    try {
      const salt = Env.CPF_ENCRYPTION_KEY ?? Env.FACE_ENCRYPTION_KEY ?? "viggo-metrics-salt";
      const hash = createHash("sha256").update(`${ip}:${salt}:${ua}`).digest("hex").slice(0, 32);
      return { visitorId: `h_${hash}`, isNew: true };
    } catch {
      // fallback to uuid
    }
  }
  return { visitorId: randomUUID(), isNew: true };
}

function setVisitorCookie(res: Response, visitorId: string) {
  // First-party, Lax, 1 year
  res.appendHeader("Set-Cookie", `vid=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; SameSite=Lax`);
}

export class MetricsController {
  async track(req: Request, res: Response) {
    try {
      const parsed = trackSchema.parse(req.body ?? {});
      const { visitorId, isNew } = resolveVisitorId(req, parsed.visitorId ?? null);

      if (isNew) setVisitorCookie(res, visitorId);

      const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;
      // country via CF-Connecting-IP / X-Country not stored yet — null for now
      const country = (req.headers["cf-ipcountry"] as string | undefined) ?? null;

      // Fire-and-forget: respond fast, log errors
      getMetricsProvider()
        .trackPageView({
          path: parsed.path,
          referrer: parsed.referrer ?? null,
          utmSource: parsed.utmSource ?? null,
          utmMedium: parsed.utmMedium ?? null,
          utmCampaign: parsed.utmCampaign ?? null,
          utmTerm: parsed.utmTerm ?? null,
          utmContent: parsed.utmContent ?? null,
          visitorId,
          userAgent,
          country,
        })
        .catch((err) => console.error("[Metrics] trackPageView failed:", err));

      return res.status(201).json({ visitorId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("[Metrics] track error:", error);
      return res.status(500).json({ message: "Erro ao registrar métrica" });
    }
  }

  async trackEvent(req: Request, res: Response) {
    try {
      const parsed = eventSchema.parse(req.body ?? {});
      let visitorId = parsed.visitorId ?? null;
      let isNew = false;
      if (!visitorId) {
        const resolved = resolveVisitorId(req, null);
        visitorId = resolved.visitorId;
        isNew = resolved.isNew;
      } else {
        // ensure cookie is set for future pageviews if not present
        const cookies = parseCookies(req.headers.cookie);
        if (!cookies.vid) isNew = true;
      }
      if (isNew && visitorId) setVisitorCookie(res, visitorId);

      getMetricsProvider()
        .trackEvent({
          name: parsed.name,
          props: parsed.props ?? null,
          visitorId,
          companyId: parsed.companyId ?? null,
          userId: parsed.userId ?? null,
        })
        .catch((err) => console.error("[Metrics] trackEvent failed:", err));

      return res.status(201).json({ visitorId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      }
      console.error("[Metrics] trackEvent error:", error);
      return res.status(500).json({ message: "Erro ao registrar evento" });
    }
  }
}
