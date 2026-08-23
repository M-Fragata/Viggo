import { Resend } from "resend";
import { Env } from "../../utils/environment.js";
import type { EmailProvider, SendEmailOptions } from "./emailProvider.js";

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor(apiKey?: string) {
    this.resend = new Resend(apiKey ?? Env.RESEND_API_KEY!);
  }

  async send(opts: SendEmailOptions): Promise<{ id: string }> {
    const payload: Record<string, unknown> = {
      from: opts.from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    };
    if (opts.text) payload.text = opts.text;
    if (opts.replyTo) payload.replyTo = opts.replyTo;
    const { data, error } = await this.resend.emails.send(payload as unknown as Parameters<Resend["emails"]["send"]>[0]);

    if (error) {
      throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }

    return { id: (data as { id: string })?.id ?? "unknown" };
  }
}
