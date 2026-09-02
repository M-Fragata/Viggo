import { Env } from "../../utils/environment.js";
import { ResendProvider } from "./resendProvider.js";
import type { EmailProvider, SendEmailOptions } from "./emailProvider.js";

// Templates
import { renderWelcomeCompany } from "../../templates/welcomeCompany.js";
import { renderTrialEnding } from "../../templates/trialEnding.js";
import { renderPaymentConfirmed } from "../../templates/paymentConfirmed.js";
import { renderPaymentOverdue } from "../../templates/paymentOverdue.js";
import { renderJustificativaCreated } from "../../templates/justificativaCreated.js";
import { renderJustificativaDecided } from "../../templates/justificativaDecided.js";
import { renderBiometricExpiring } from "../../templates/biometricExpiring.js";
import { renderResetPassword } from "../../templates/resetPassword.js";
import { renderEmployeeWelcome } from "../../templates/employeeWelcome.js";
import { renderBiometricPurged } from "../../templates/biometricPurged.js";
import { renderPaymentUpcoming } from "../../templates/paymentUpcoming.js";
import { renderSubscriptionCancelled } from "../../templates/subscriptionCancelled.js";
import { renderTotemRecoveryCode } from "../../templates/totemRecoveryCode.js";

let provider: EmailProvider | null = null;

function getProvider(): EmailProvider {
  if (!provider) provider = new ResendProvider();
  return provider;
}

/** For tests — inject mock provider */
export function setEmailProvider(p: EmailProvider) {
  provider = p;
}

export function resetEmailProvider() {
  provider = null;
}

function isEmailEnabled(): boolean {
  if (!Env.EMAIL_ENABLED) return false;
  if (Env.NODE_ENV === "TEST") return false;
  return true;
}

function resolveTo(originalTo: string | string[]): string[] {
  const arr = Array.isArray(originalTo) ? originalTo : [originalTo];
  const testTo = (Env.EMAIL_TEST_TO as string | undefined)?.trim();
  if (testTo) {
    console.log(`[Email] Redirect: ${arr.join(", ")} → ${testTo}`);
    return [testTo];
  }
  return arr;
}

async function sendRaw(opts: SendEmailOptions): Promise<{ id: string } | null> {
  if (!isEmailEnabled()) {
    console.log(`[Email] Skipped (disabled): ${opts.subject} → ${Array.isArray(opts.to) ? opts.to.join(",") : opts.to}`);
    return null;
  }

  const to = resolveTo(opts.to);

  if (Env.EMAIL_PREVIEW) {
    console.log(`[Email PREVIEW] From: ${opts.from} To: ${to.join(", ")} Subject: ${opts.subject}`);
    console.log(opts.html.slice(0, 500));
    return { id: "preview" };
  }

  if (!Env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY missing — skipping send");
    return null;
  }

  try {
    const result = await getProvider().send({ ...opts, to });
    console.log(`[Email] Sent: ${opts.subject} → ${to.join(", ")} id=${result.id}`);
    return result;
  } catch (error) {
    console.error(`[Email] Failed: ${opts.subject} → ${to.join(", ")}`, error);
    throw error;
  }
}

// ── Public API ──

function buildOpts(base: Omit<SendEmailOptions, "replyTo"> & { replyTo?: string | undefined }): SendEmailOptions {
  const opts: SendEmailOptions = {
    from: base.from,
    to: base.to,
    subject: base.subject,
    html: base.html,
    text: base.text,
  };
  const rt = Env.EMAIL_REPLY_TO?.trim();
  if (rt) opts.replyTo = rt;
  return opts;
}

export async function sendWelcomeCompany(props: {
  to: string;
  adminName: string;
  companyName: string;
  trialExpiresAt: Date;
}) {
  const { subject, html, text } = renderWelcomeCompany(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendTrialEnding(props: {
  to: string | string[];
  companyName: string;
  daysRemaining: 3 | 1;
  planExpiresAt: Date;
}) {
  const { subject, html, text } = renderTrialEnding(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendPaymentConfirmed(props: {
  to: string | string[];
  companyName: string;
  amount: number;
  billingType: string;
  paidAt: Date;
  nfseUrl?: string | null;
}) {
  const { subject, html, text } = renderPaymentConfirmed(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendPaymentOverdue(props: {
  to: string | string[];
  companyName: string;
  amount: number;
  dueDate: Date;
}) {
  const { subject, html, text } = renderPaymentOverdue(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendJustificativaCreated(props: {
  to: string | string[];
  employeeName: string;
  tipo: string;
  descricao: string;
  dataInicio: Date;
  dataFim?: Date | null;
}) {
  const { subject, html, text } = renderJustificativaCreated(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendJustificativaDecided(props: {
  to: string;
  employeeName: string;
  tipo: string;
  aprovado: boolean;
  dataInicio: Date;
}) {
  const { subject, html, text } = renderJustificativaDecided(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendBiometricExpiring(props: {
  to: string;
  userName: string;
  expiresAt: Date;
}) {
  const { subject, html, text } = renderBiometricExpiring(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendResetPassword(props: { to: string; code: string }) {
  const { subject, html, text } = renderResetPassword(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendEmployeeWelcome(props: { to: string; employeeName: string; companyName: string }) {
  const { subject, html, text } = renderEmployeeWelcome(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendBiometricPurged(props: { to: string; userName: string }) {
  const { subject, html, text } = renderBiometricPurged(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendPaymentUpcoming(props: {
  to: string | string[];
  companyName: string;
  amount: number;
  dueDate: Date;
  daysRemaining: 3 | 1;
}) {
  const { subject, html, text } = renderPaymentUpcoming(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendSubscriptionCancelled(props: { to: string | string[]; companyName: string }) {
  const { subject, html, text } = renderSubscriptionCancelled(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

export async function sendTotemRecoveryCode(props: {
  to: string | string[];
  code: string;
  companyName: string;
  adminName?: string | undefined;
}) {
  const { subject, html, text } = renderTotemRecoveryCode(props);
  return sendRaw(buildOpts({ from: Env.EMAIL_FROM, to: props.to, subject, html, text }));
}

