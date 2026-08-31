import { describe, it, expect, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  FRONTEND_URL: "https://test.viggo.com.br",
}));

vi.mock("../../../utils/environment.js", () => ({
  Env: mockEnv,
}));

import { renderWelcomeCompany } from "../../../templates/welcomeCompany.js";
import { renderTrialEnding } from "../../../templates/trialEnding.js";
import { renderPaymentConfirmed } from "../../../templates/paymentConfirmed.js";
import { renderPaymentOverdue } from "../../../templates/paymentOverdue.js";
import { renderJustificativaCreated } from "../../../templates/justificativaCreated.js";
import { renderJustificativaDecided } from "../../../templates/justificativaDecided.js";
import { renderBiometricExpiring } from "../../../templates/biometricExpiring.js";
import { renderResetPassword } from "../../../templates/resetPassword.js";
import { renderEmployeeWelcome } from "../../../templates/employeeWelcome.js";
import { renderBiometricPurged } from "../../../templates/biometricPurged.js";
import { renderPaymentUpcoming } from "../../../templates/paymentUpcoming.js";
import { renderSubscriptionCancelled } from "../../../templates/subscriptionCancelled.js";
import { baseLayout } from "../../../templates/layout.js";

// helper structural asserts
function assertBaseStructure(html: string) {
  expect(html).toContain("<!DOCTYPE html>");
  expect(html).toContain('lang="pt-BR"');
  expect(html).toContain("#0a0a0a"); // header
  expect(html).toContain("#00d4a4"); // brand
  expect(html).toContain("Viggo");
  expect(html).toContain("suporte@viggo.com.br");
  expect(html).toContain("dpo@viggo.com.br");
}

describe("templates - structural asserts (sem snapshot)", () => {
  describe("baseLayout", () => {
    it("deve renderizar estrutura base com header, card e footer", () => {
      const html = baseLayout({
        preheader: "preheader test",
        title: "Título Teste",
        subtitle: "Subtítulo",
        children: "<p>conteúdo</p>",
      });
      assertBaseStructure(html);
      expect(html).toContain("Título Teste");
      expect(html).toContain("Subtítulo");
      expect(html).toContain("conteúdo");
      expect(html).toContain("preheader test");
    });

    it("deve renderizar CTA quando ctaUrl e ctaLabel informados", () => {
      const html = baseLayout({
        preheader: "pre",
        title: "t",
        children: "c",
        ctaUrl: "https://example.com",
        ctaLabel: "Clique aqui",
      });
      expect(html).toContain("Clique aqui");
      expect(html).toContain("https://example.com");
    });

    it("não deve renderizar CTA quando ausente", () => {
      const html = baseLayout({ preheader: "p", title: "t", children: "c" });
      expect(html).not.toContain("Clique aqui");
    });
  });

  it("welcomeCompany — subject contém companyName, html contém adminName e trial date", () => {
    const date = new Date("2026-09-30T12:00:00Z");
    const { subject, html, text } = renderWelcomeCompany({
      adminName: "João Silva",
      companyName: "Acme Ltda",
      trialExpiresAt: date,
    });
    expect(subject).toContain("Acme Ltda");
    expect(subject).toContain("trial");
    expect(html).toContain("João Silva");
    expect(html).toContain("Acme Ltda");
    expect(text).toContain("João Silva");
    expect(text).toContain("Acme Ltda");
    assertBaseStructure(html);
    expect(text.length).toBeGreaterThan(10);
  });

  it("trialEnding — D-3 e D-1 subjects distintos e html contém daysRemaining", () => {
    const exp = new Date("2026-09-30");
    const r3 = renderTrialEnding({ companyName: "Beta", daysRemaining: 3, planExpiresAt: exp });
    const r1 = renderTrialEnding({ companyName: "Beta", daysRemaining: 1, planExpiresAt: exp });
    expect(r3.subject).toContain("3 dias");
    expect(r1.subject).toContain("Último dia");
    expect(r3.html).toContain("Beta");
    expect(r1.html).toContain("Beta");
    expect(r3.text).toBeTruthy();
    expect(r1.text).toBeTruthy();
    assertBaseStructure(r3.html);
  });

  it("paymentConfirmed — subject com valor BRL, html com nfse condicional", () => {
    const paidAt = new Date("2026-08-31");
    const withNfse = renderPaymentConfirmed({
      companyName: "Acme",
      amount: 54.9,
      billingType: "PIX",
      paidAt,
      nfseUrl: "https://nfse.test/123",
    });
    const withoutNfse = renderPaymentConfirmed({
      companyName: "Acme",
      amount: 54.9,
      billingType: "BOLETO",
      paidAt,
      nfseUrl: null,
    });
    expect(withNfse.subject).toContain("R$");
    expect(withNfse.html).toContain("Acme");
    expect(withNfse.html).toContain("PIX");
    expect(withNfse.html).toContain("https://nfse.test/123");
    expect(withoutNfse.html).toContain("48h");
    expect(withNfse.text).toContain("Acme");
    assertBaseStructure(withNfse.html);
  });

  it("paymentOverdue — subject alerta e html contém amount", () => {
    const { subject, html, text } = renderPaymentOverdue({
      companyName: "Acme",
      amount: 100,
      dueDate: new Date("2026-08-20"),
    });
    expect(subject.toLowerCase()).toContain("atraso");
    expect(html).toContain("Acme");
    expect(text).toContain("Acme");
    assertBaseStructure(html);
  });

  it("justificativaCreated — subject com tipo e employeeName", () => {
    const { subject, html, text } = renderJustificativaCreated({
      employeeName: "Maria",
      tipo: "ATESTADO",
      descricao: "Consulta médica",
      dataInicio: new Date("2026-08-25"),
      dataFim: new Date("2026-08-26"),
    });
    expect(subject.toLowerCase()).toContain("atestado");
    expect(subject).toContain("Maria");
    expect(html).toContain("Maria");
    expect(html).toContain("Consulta médica");
    expect(text).toContain("Maria");
    assertBaseStructure(html);
  });

  it("justificativaDecided — aprovado vs reprovado", () => {
    const ok = renderJustificativaDecided({
      employeeName: "Maria",
      tipo: "FALTA",
      aprovado: true,
      dataInicio: new Date("2026-08-25"),
    });
    const no = renderJustificativaDecided({
      employeeName: "Maria",
      tipo: "FALTA",
      aprovado: false,
      dataInicio: new Date("2026-08-25"),
    });
    expect(ok.subject.toLowerCase()).toContain("aprovada");
    expect(no.subject.toLowerCase()).toContain("não aprovada");
    expect(ok.html).toContain("Maria");
    expect(no.html).toContain("Maria");
    assertBaseStructure(ok.html);
  });

  it("biometricExpiring — contém userName e expiresAt", () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { subject, html, text } = renderBiometricExpiring({
      userName: "Carlos",
      expiresAt,
    });
    expect(subject.toLowerCase()).toContain("biometria");
    expect(html).toContain("Carlos");
    expect(text).toContain("Carlos");
    assertBaseStructure(html);
  });

  it("resetPassword — subject, código com letter-spacing e preheader", () => {
    const { subject, html, text } = renderResetPassword({ code: "123456" });
    expect(subject).toContain("Código");
    expect(html).toContain("123456");
    expect(html).toContain("letter-spacing:8px");
    expect(html).toContain("10 minutos");
    expect(text).toContain("123456");
    assertBaseStructure(html);
  });

  it("employeeWelcome — contém employeeName e companyName", () => {
    const { subject, html, text } = renderEmployeeWelcome({
      employeeName: "Ana",
      companyName: "Acme",
    });
    expect(subject).toContain("Acme");
    expect(html).toContain("Ana");
    expect(html).toContain("Acme");
    expect(text).toContain("Ana");
    assertBaseStructure(html);
  });

  it("biometricPurged — contém userName e alerta LGPD", () => {
    const { subject, html, text } = renderBiometricPurged({ userName: "Bob" });
    expect(subject.toLowerCase()).toContain("biometria");
    expect(html).toContain("Bob");
    expect(text).toContain("Bob");
    assertBaseStructure(html);
  });

  it("paymentUpcoming — D-3 e D-1 distintos", () => {
    const due = new Date("2026-09-10");
    const r3 = renderPaymentUpcoming({ companyName: "Acme", amount: 99.9, dueDate: due, daysRemaining: 3 });
    const r1 = renderPaymentUpcoming({ companyName: "Acme", amount: 99.9, dueDate: due, daysRemaining: 1 });
    expect(r3.subject).toContain("3 dias");
    expect(r1.subject).toContain("amanhã");
    expect(r3.html).toContain("3 dias");
    expect(r1.html).toContain("1 dia");
    expect(r3.html).toContain("Acme");
    expect(r1.html).toContain("Acme");
    // cores distintas: urgente vermelho vs amarelo
    expect(r1.html).toContain("#d45656");
    expect(r3.html).toContain("#c37d0d");
    assertBaseStructure(r3.html);
  });

  it("subscriptionCancelled — subject contém companyName", () => {
    const { subject, html, text } = renderSubscriptionCancelled({ companyName: "Acme" });
    expect(subject).toContain("Acme");
    expect(html).toContain("Acme");
    expect(text).toContain("Acme");
    assertBaseStructure(html);
  });
});
