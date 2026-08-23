import { Router } from "express";
import { Env } from "../utils/environment.js";
import { renderWelcomeCompany } from "../templates/welcomeCompany.js";
import { renderTrialEnding } from "../templates/trialEnding.js";
import { renderPaymentConfirmed } from "../templates/paymentConfirmed.js";
import { renderPaymentOverdue } from "../templates/paymentOverdue.js";
import { renderJustificativaCreated } from "../templates/justificativaCreated.js";
import { renderJustificativaDecided } from "../templates/justificativaDecided.js";
import { renderBiometricExpiring } from "../templates/biometricExpiring.js";
import { renderResetPassword } from "../templates/resetPassword.js";
import { renderEmployeeWelcome } from "../templates/employeeWelcome.js";
import { renderBiometricPurged } from "../templates/biometricPurged.js";
import { renderPaymentUpcoming } from "../templates/paymentUpcoming.js";
import { renderSubscriptionCancelled } from "../templates/subscriptionCancelled.js";

export const devRoutes = Router();

// GET /dev/email/preview/:template — retorna HTML renderizado com dados mock (DEV only)
const templates: Record<string, () => { subject: string; html: string; text: string }> = {
  "welcome-company": () =>
    renderWelcomeCompany({
      adminName: "João Silva",
      companyName: "Empresa Demo LTDA",
      trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }),
  "trial-ending-3d": () =>
    renderTrialEnding({
      companyName: "Empresa Demo LTDA",
      daysRemaining: 3,
      planExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    }),
  "trial-ending-1d": () =>
    renderTrialEnding({
      companyName: "Empresa Demo LTDA",
      daysRemaining: 1,
      planExpiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    }),
  "payment-confirmed": () =>
    renderPaymentConfirmed({
      companyName: "Empresa Demo LTDA",
      amount: 54.9,
      billingType: "PIX",
      paidAt: new Date(),
      nfseUrl: null,
    }),
  "payment-overdue": () =>
    renderPaymentOverdue({
      companyName: "Empresa Demo LTDA",
      amount: 54.9,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    }),
  "justificativa-created": () =>
    renderJustificativaCreated({
      employeeName: "Maria Santos",
      tipo: "ATESTADO",
      descricao: "Atestado médico de 2 dias por consulta. CID J06.9",
      dataInicio: new Date(),
      dataFim: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }),
  "justificativa-decided-approved": () =>
    renderJustificativaDecided({
      employeeName: "Maria Santos",
      tipo: "ATESTADO",
      aprovado: true,
      dataInicio: new Date(),
    }),
  "justificativa-decided-rejected": () =>
    renderJustificativaDecided({
      employeeName: "Maria Santos",
      tipo: "ATESTADO",
      aprovado: false,
      dataInicio: new Date(),
    }),
  "biometric-expiring": () =>
    renderBiometricExpiring({
      userName: "Carlos Oliveira",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }),
  "reset-password": () =>
    renderResetPassword({
      code: "482913",
    }),
  "employee-welcome": () =>
    renderEmployeeWelcome({
      employeeName: "João Silva",
      companyName: "Empresa Demo LTDA",
    }),
  "biometric-purged": () =>
    renderBiometricPurged({
      userName: "Carlos Oliveira",
    }),
  "payment-upcoming-3d": () =>
    renderPaymentUpcoming({
      companyName: "Empresa Demo LTDA",
      amount: 59.9,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      daysRemaining: 3,
    }),
  "payment-upcoming-1d": () =>
    renderPaymentUpcoming({
      companyName: "Empresa Demo LTDA",
      amount: 59.9,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      daysRemaining: 1,
    }),
  "subscription-cancelled": () =>
    renderSubscriptionCancelled({
      companyName: "Empresa Demo LTDA",
    }),
};

devRoutes.get("/email/preview/:template", (req, res) => {
  if (Env.NODE_ENV === "PROD") {
    return res.status(404).json({ message: "Not found" });
  }
  const fn = templates[req.params.template];
  if (!fn) {
    return res.status(404).json({
      message: "Template não encontrado",
      available: Object.keys(templates),
    });
  }
  const { subject, html, text } = fn();
  // Se ?format=json, retorna JSON; senão HTML direto para preview no browser
  if (req.query.format === "json") {
    return res.json({ subject, html, text });
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
});

devRoutes.get("/email/preview", (_req, res) => {
  if (Env.NODE_ENV === "PROD") {
    return res.status(404).json({ message: "Not found" });
  }
  const links = Object.keys(templates)
    .map((k) => `<li><a href="/dev/email/preview/${k}" target="_blank">${k}</a> — <a href="/dev/email/preview/${k}?format=json" target="_blank">json</a></li>`)
    .join("");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<html><body style="font-family:system-ui;padding:32px"><h1>Preview E-mails Viggo</h1><ul>${links}</ul></body></html>`);
});

// POST /dev/email/send-test — envia e-mail real para EMAIL_TEST_TO (DEV only)
devRoutes.post("/email/send-test", async (req, res) => {
  if (Env.NODE_ENV === "PROD") {
    return res.status(404).json({ message: "Not found" });
  }
  const { template } = req.body as { template?: string };
  const fn = template ? templates[template] : undefined;
  if (!template || !fn) {
    return res.status(400).json({ message: "Informe template válido", available: Object.keys(templates) });
  }
  try {
    const { ResendProvider } = await import("../services/email/resendProvider.js");
    const { Env: EnvInner } = await import("../utils/environment.js");
    const { subject, html, text } = fn();
    const to = EnvInner.EMAIL_TEST_TO || "dragonbolad@gmail.com";
    const provider = new ResendProvider();
    const sendPayload: { from: string; to: string; subject: string; html: string; text: string; replyTo?: string } = {
      from: EnvInner.EMAIL_FROM,
      to,
      subject: `[TEST] ${subject}`,
      html,
      text,
    };
    if (EnvInner.EMAIL_REPLY_TO) sendPayload.replyTo = EnvInner.EMAIL_REPLY_TO;
    const result = await provider.send(sendPayload);
    return res.json({ sent: true, to, subject, id: result.id });
  } catch (error) {
    console.error("[dev/send-test]", error);
    return res.status(500).json({ message: "Falha ao enviar", error: String(error) });
  }
});
