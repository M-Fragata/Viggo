export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string | undefined;
  replyTo?: string | undefined;
}

export interface EmailProvider {
  send(opts: SendEmailOptions): Promise<{ id: string }>;
}
