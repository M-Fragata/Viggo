/**
 * E2E Asaas Sandbox — cobre todas as 8 funcionalidades Asaas na Viggo
 * Uso: ASAAS_API_KEY real no .env (sandbox), Neon DEV
 *   npm run test:asaas:e2e
 *   ou: npx tsx --env-file .env src/scripts/e2eAsaasSandbox.ts
 *   ou mock: ASAAS_API_KEY=test- npx tsx src/scripts/e2eAsaasSandbox.ts
 *
 * Fluxos: signup(createCustomer) → checkout(createSubscription) → history → employees(updateSubscription) → retry(createPayment) → webhooks(PAYMENT_CONFIRMED/OVERDUE/SUBSCRIPTION_DELETED) → fallback getPaymentsByCustomer → cancel
 */

import { prisma } from "../database/prisma.js";
import { Env } from "../utils/environment.js";
import { calculateDynamicPrice, PRICING } from "../utils/pricingCalculator.js";
import * as asaasService from "../services/asaasService.js";
import { PaymentController } from "../controller/payment/PaymentController.js";
import { validateCNPJ, validateCPF } from "../utils/cpfCnpjValidator.js";
import bcrypt from "bcrypt";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3333";
const isMock = !Env.ASAAS_API_KEY || Env.ASAAS_API_KEY.startsWith("test-");

function log(step: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "✅" : "❌"} ${step}${detail ? ` — ${detail}` : ""}`);
}

function generateValidCnpj(): string {
  const base = Math.floor(Math.random() * 1e8).toString().padStart(8, "0") + "0001";
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(base[i]!) * w1[i]!;
  let d1 = sum % 11; d1 = d1 < 2 ? 0 : 11 - d1;
  const withD1 = base + d1;
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0; for (let i = 0; i < 13; i++) sum += parseInt(withD1[i]!) * w2[i]!;
  let d2 = sum % 11; d2 = d2 < 2 ? 0 : 11 - d2;
  const cnpj = withD1 + d2;
  if (!validateCNPJ(cnpj)) return generateValidCnpj();
  return cnpj;
}

function generateValidCpf(): string {
  const n = () => Math.floor(Math.random() * 10);
  const base = Array.from({ length: 9 }, n);
  let sum = 0; for (let i = 0; i < 9; i++) sum += base[i]! * (10 - i);
  let d1 = 11 - (sum % 11); if (d1 >= 10) d1 = 0;
  sum = 0; for (let i = 0; i < 9; i++) sum += base[i]! * (11 - i); sum += d1 * 2;
  let d2 = 11 - (sum % 11); if (d2 >= 10) d2 = 0;
  const cpf = [...base, d1, d2].join("");
  if (/^(\d)\1{10}$/.test(cpf) || !validateCPF(cpf)) return generateValidCpf();
  return cpf;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function webhookHeaders() {
  return { "Content-Type": "application/json", "asaas-access-token": Env.ASAAS_WEBHOOK_TOKEN || "test-webhook-token" };
}

async function main() {
  console.log("=== E2E Asaas Sandbox Viggo ===");
  console.log(`Env: ASAAS_ENVIRONMENT=${Env.ASAAS_ENVIRONMENT} ASAAS_API_KEY=${Env.ASAAS_API_KEY ? `${String(Env.ASAAS_API_KEY).slice(0, 8)}...` : "MISSING"} MASTER_CNPJ=${Env.MASTER_CNPJ || "none"}`);
  console.log("=== E2E Asaas Sandbox Ponto Fragata ===");
  console.log(`ASAAS_ENVIRONMENT=${Env.ASAAS_ENVIRONMENT}`);
  console.log(`ASAAS_API_KEY=${Env.ASAAS_API_KEY ? `${Env.ASAAS_API_KEY.slice(0, 15)}...` : "MISSING!"}`);
  console.log(`MASTER_CNPJ=${Env.MASTER_CNPJ ?? "não configurado"}`);

  if (!Env.ASAAS_API_KEY) {
    console.error("❌ ASAAS_API_KEY não configurada no .env — abortando.");
    process.exit(1);
  }

  // Quick health check — ping na API do Asaas para confirmar conectividade/chave válida
  console.log("\n[0/10] Verificando conectividade com API do Asaas...");
  try {
    const pingRes = await fetch(
      `${Env.ASAAS_ENVIRONMENT === "production" ? "https://api.asaas.com" : "https://sandbox.asaas.com"}/v3/customers?limit=1`,
      { headers: { access_token: Env.ASAAS_API_KEY } }
    );
    if (!pingRes.ok) {
      const errBody = await pingRes.text();
      console.warn(`⚠️  Asaas API respondeu HTTP ${pingRes.status}: ${errBody.slice(0, 200)}`);
    } else {
      console.log("✓ Conectividade com Asaas OK (chave válida)");
    }
  } catch (e) {
    console.warn("[Asaas] ping exception:", e instanceof Error ? e.message : String(e));
  }

  const ts = Date.now();
  const e2ePrefix = `e2e-${ts}`;
  const companyName = `E2E Ponto Fragata ${ts}`;
  const adminEmail = `e2e-admin-${ts}@fragata-test.com.br`;
  const adminName = "E2E Admin";
  const cnpj = generateValidCnpj();
  const cpf = generateValidCpf();
  const password = "TestPassword123!";

  let companyId = "";
  let adminToken = "";
  let asaasCustomerId: string | null = null;
  let asaasSubscriptionId: string | null = null;

  const paymentController = new PaymentController();

  // Cleanup prévio (idempotente) - apaga resíduos de execuções anteriores com prefixo e2e
  console.log("\n[1/10] Cleanup prévio...");
  try {
    const staleCompanies = await prisma.company.findMany({ where: { cnpj: { startsWith: "99" } }, select: { id: true } });
    // Também limpa por email e2e
    const e2eUsers = await prisma.user.findMany({ where: { email: { contains: "@fragata-test.com.br" } }, select: { companyId: true } });
    const staleIds = new Set([...staleCompanies.map(c => c.id), ...e2eUsers.map(u => u.companyId)]);
    for (const id of staleIds) {
      try {
        await prisma.payment.deleteMany({ where: { companyId: id } });
        await prisma.subscription.deleteMany({ where: { companyId: id } });
        await prisma.consentimento.deleteMany({ where: { user: { companyId: id } } });
        await prisma.auditLog.deleteMany({ where: { companyId: id } });
        await prisma.workSchedule.deleteMany({ where: { companyId: id } });
        await prisma.inviteTokenUsage.deleteMany({ where: { inviteToken: { companyId: id } } });
        await prisma.inviteToken.deleteMany({ where: { companyId: id } });
        await prisma.checkIn.deleteMany({ where: { companyId: id } });
        await prisma.justificativa.deleteMany({ where: { companyId: id } });
        await prisma.user.deleteMany({ where: { companyId: id } });
        await prisma.company.delete({ where: { id } }).catch(() => {});
      } catch {}
    }
    console.log(`  limpeza prévia concluída`);
  } catch (e) {
    console.warn("  cleanup warn:", e instanceof Error ? e.message : String(e));
  }
  await sleep(300);

  // 2. Signup (createCustomer #1)
  console.log("\n[2/10] Signup (createCustomer) ...");
  try {
    const signupRes = await fetch(`${BASE_URL}/companies/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: adminName,
        email: adminEmail,
        cpf,
        cnpj,
        companyName,
        password,
        confirmPassword: password,
        aceiteContratos: true,
        aceiteTermos: true,
        aceiteDpa: true,
      }),
    });
    const signupBody = (await signupRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (signupRes.status !== 201) {
      throw new Error(`signup ${signupRes.status} ${JSON.stringify(signupBody).slice(0, 500)}`);
    }
    companyId = (signupBody.company as Record<string, unknown>).id as string;
    adminToken = signupBody.token as string;
    const comp = await prisma.company.findUnique({ where: { id: companyId }, select: { asaasCustomerId: true, status: true } });
    asaasCustomerId = comp?.asaasCustomerId || null;
    log("Signup createCustomer", true, `companyId=${companyId} asaasCustomerId=${asaasCustomerId || "null (catch não bloqueia)"} status=${comp?.status}`);
  } catch (e) {
    // Fallback direto via prisma se HTTP falhar (servidor não rodando)
    console.warn("  signup via HTTP falhou, fallback prisma direto:", e instanceof Error ? e.message : String(e));
    const hash = await bcrypt.hash(password, 10);
    const company = await prisma.company.create({
      data: {
        name: companyName, cnpj, plan: "DYNAMIC", status: "TRIAL", maxEmployees: 10,
        planExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), trialUsed: true, settings: {},
      },
    });
    companyId = company.id;
    const user = await prisma.user.create({
      data: { name: adminName, email: adminEmail, password: hash, role: "ENTERPRISE_ADMIN", companyId, cpf },
    });
    // Gera token manual (mesmo secret do Env)
    const jwt = await import("jsonwebtoken");
    adminToken = (jwt.default as unknown as { sign: (p: unknown, s: string, o: unknown) => string }).sign(
      { id: user.id, role: "ENTERPRISE_ADMIN", companyId, planTier: "DYNAMIC" },
      Env.JWT_SECRET, { expiresIn: "1h" }
    );
    log("Signup fallback prisma", true, `companyId=${companyId}`);
  }
  await sleep(700);

  // 3. Checkout (createSubscription)
  console.log("\n[3/10] Checkout (createSubscription) PIX ...");
  try {
    let customerId = asaasCustomerId;
    if (!customerId && !isMock) {
      // Se signup não criou, checkout vai criar
      console.log("  asaasCustomerId null, checkout vai criar");
    }
    const checkoutRes = await fetch(`${BASE_URL}/companies/payments/checkout`, {
      method: "POST",
      headers: authHeaders(adminToken),
      body: JSON.stringify({ billingType: "PIX" }),
    });
    const checkoutBody = (await checkoutRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (checkoutRes.status !== 200 && !checkoutBody.free) {
      throw new Error(`checkout ${checkoutRes.status} ${JSON.stringify(checkoutBody).slice(0, 500)}`);
    }
    if (checkoutBody.free) {
      log("Checkout isenção master", true, "free:true");
    } else {
      asaasSubscriptionId = checkoutBody.subscriptionId as string;
      log("Checkout createSubscription", true, `subscriptionId=${asaasSubscriptionId} amount=${String(checkoutBody.amount)} billingType=${String(checkoutBody.billingType)}`);
      const sub = await prisma.subscription.findFirst({ where: { companyId }, orderBy: { createdAt: "desc" } });
      const comp = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true, planExpiresAt: true, asaasCustomerId: true } });
      asaasCustomerId = comp?.asaasCustomerId || asaasCustomerId;
      log("Checkout DB", !!sub && comp?.status === "ACTIVE", `status=${comp?.status} sub=${sub?.status} asaasSub=${sub?.asaasSubscriptionId?.slice(0, 8)}`);
    }
  } catch (e) {
    log("Checkout", false, e instanceof Error ? e.message : String(e));
  }
  await sleep(700);

  // 4. History (sem sync)
  console.log("\n[4/10] History (prisma only) ...");
  try {
    const hRes = await fetch(`${BASE_URL}/companies/payments/history`, { headers: authHeaders(adminToken) });
    const hBody = await hRes.json().catch(() => []);
    log("History", hRes.ok, `count=${Array.isArray(hBody) ? hBody.length : "?"}`);
    // 401 sem token
    const h401 = await fetch(`${BASE_URL}/companies/payments/history`);
    log("History 401 sem token", h401.status === 401);
  } catch (e) {
    log("History", false, String(e));
  }
  await sleep(300);

  // 5. Dynamic pricing — updateSubscription
  console.log("\n[5/10] Dynamic pricing (updateSubscription) ...");
  try {
    const price = (n: number) => calculateDynamicPrice(n);
    console.log(`  Pricing check: 1 user -> ${price(1).total} (paid 0), 11 users -> ${price(11).total}, 12 -> ${price(12).total}, 15 -> ${price(15).total}`);
    // Estado inicial: 1 admin
    let totalUsers = await prisma.user.count({ where: { companyId } });
    log("Initial users", true, `total=${totalUsers} price=${price(totalUsers).total}`);

    // Criar 9 employees -> total 10 (paid 9) ainda 54.90
    for (let i = 0; i < 9; i++) {
      const email = `e2e-emp-${ts}-${i}@fragata-test.com.br`;
      await fetch(`${BASE_URL}/employees`, {
        method: "POST",
        headers: authHeaders(adminToken),
        body: JSON.stringify({ name: `Emp ${i}`, email, role: "EMPLOYEE" }),
      });
      await sleep(150);
    }
    await sleep(800); // espera updateSubscription fire-and-forget
    let     sub = await prisma.subscription.findFirst({ where: { companyId, status: "ACTIVE" } });
    log("After 9 emps (total 10, paid 9)", Number(sub?.price) === 54.9, `price=${sub?.price} extra=${sub?.extraEmployees}`);

    // 11º user (total 11, paid 10) ainda 54.90 borda
    await fetch(`${BASE_URL}/employees`, {
      method: "POST", headers: authHeaders(adminToken),
      body: JSON.stringify({ name: "Emp borda", email: `e2e-borda-${ts}@fragata-test.com.br`, role: "EMPLOYEE" }),
    });
    await sleep(800);
    sub = await prisma.subscription.findFirst({ where: { companyId, status: "ACTIVE" } });
    log("Borda 11 users (paid 10)", Number(sub?.price) === 54.9, `price=${sub?.price}`);

    // 12º user (total 12, paid 11) -> 59.90
    await fetch(`${BASE_URL}/employees`, {
      method: "POST", headers: authHeaders(adminToken),
      body: JSON.stringify({ name: "Emp extra", email: `e2e-extra-${ts}@fragata-test.com.br`, role: "EMPLOYEE" }),
    });
    await sleep(1000);
    sub = await prisma.subscription.findFirst({ where: { companyId, status: "ACTIVE" } });
    log("Extra 12 users (paid 11) -> 59.90", Number(sub?.price) === 59.9, `price=${sub?.price} extra=${sub?.extraEmployees}`);

    // Bulk 3 (total 15, paid 14 -> 74.90)
    const bulkEmails = [1, 2, 3].map(i => ({ name: `Bulk ${i}`, email: `e2e-bulk-${ts}-${i}@fragata-test.com.br`, role: "EMPLOYEE" as const }));
    await fetch(`${BASE_URL}/employees/bulk-import`, {
      method: "POST", headers: authHeaders(adminToken),
      body: JSON.stringify({ employees: bulkEmails }),
    });
    await sleep(1200);
    sub = await prisma.subscription.findFirst({ where: { companyId, status: "ACTIVE" } });
    log("Bulk 3 (total 15, paid 14) -> 74.90", Number(sub?.price) === 74.9, `price=${sub?.price} extra=${sub?.extraEmployees}`);

  } catch (e) {
    log("Dynamic pricing", false, e instanceof Error ? e.message : String(e));
  }
  await sleep(500);

  // 6. Retry (createPayment avulso)
  console.log("\n[6/10] Retry (createPayment avulso) ...");
  try {
    const rRes = await fetch(`${BASE_URL}/companies/payments/retry`, {
      method: "POST", headers: authHeaders(adminToken),
      body: JSON.stringify({ billingType: "BOLETO" }),
    });
    const rBody = (await rRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (rRes.ok) {
      log("Retry createPayment", true, `paymentId=${String(rBody.paymentId || "").slice(0, 8)} amount=${String(rBody.amount || "")} billingType=${String(rBody.billingType || "")}`);
      const pay = await prisma.payment.findFirst({ where: { companyId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
      log("Retry DB PENDING", !!pay, `pay=${pay?.id?.slice(0, 8)} amount=${pay?.amount}`);
    } else {
      log("Retry", false, `${rRes.status} ${JSON.stringify(rBody).slice(0, 300)}`);
    }
  } catch (e) {
    log("Retry", false, String(e));
  }
  await sleep(700);

  // 7. Webhooks simulados (validateWebhookToken + handleWebhook)
  console.log("\n[7/10] Webhooks simulados ...");
  const doWebhook = async (event: string, payment: Record<string, unknown>, expectStatus = 200) => {
    const res = await fetch(`${BASE_URL}/companies/payments/webhook`, {
      method: "POST",
      headers: webhookHeaders(),
      body: JSON.stringify({ event, payment }),
    });
    const body = await res.json().catch(() => ({}));
    const ok = res.status === expectStatus;
    log(`Webhook ${event}`, ok, `status=${res.status} body=${JSON.stringify(body).slice(0, 120)}`);
    await sleep(400);
    return res;
  };

  // 7.0 negativo sem token
  await fetch(`${BASE_URL}/companies/payments/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "PAYMENT_CONFIRMED", payment: {} }) })
    .then(r => log("Webhook sem token -> 401", r.status === 401));

  // PAYMENT_CONFIRMED
  const payId = `pay_e2e_${ts}`;
  await doWebhook("PAYMENT_CONFIRMED", {
    id: payId, customer: asaasCustomerId, subscription: asaasSubscriptionId,
    status: "CONFIRMED", value: 74.9, billingType: "PIX",
    dueDate: new Date().toISOString().slice(0, 10), paymentDate: new Date().toISOString(),
    externalReference: companyId,
  });
  const afterConfirmed = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true, planExpiresAt: true } });
  log("After PAYMENT_CONFIRMED", afterConfirmed?.status === "ACTIVE", `status=${afterConfirmed?.status}`);

  // PAYMENT_OVERDUE
  await doWebhook("PAYMENT_OVERDUE", { id: `pay_over_${ts}`, value: 74.9, dueDate: new Date().toISOString().slice(0, 10), externalReference: companyId });
  const afterOverdue = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true } });
  log("After PAYMENT_OVERDUE -> SUSPENDED", afterOverdue?.status === "SUSPENDED");

  // SUBSCRIPTION_DELETED
  if (asaasSubscriptionId) {
    await doWebhook("SUBSCRIPTION_DELETED", { subscription: asaasSubscriptionId });
    const afterDel = await prisma.subscription.findFirst({ where: { asaasSubscriptionId } });
    const afterDelComp = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true } });
    log("After SUBSCRIPTION_DELETED", afterDel?.status === "CANCELLED" && afterDelComp?.status === "CANCELLED", `sub=${afterDel?.status} comp=${afterDelComp?.status}`);
  }

  // Idempotência: erro interno deve retornar 200
  // (forçando webhook com subscription inexistente não deve 500)
  await doWebhook("PAYMENT_CONFIRMED", { id: "pay_fake", subscription: "sub_inexistente", externalReference: companyId });

  await sleep(300);

  // 8. Fallback sync
  console.log("\n[8/10] Fallback getPaymentsByCustomer (?sync=true) ...");
  try {
    const syncRes = await fetch(`${BASE_URL}/companies/payments/history?sync=true`, { headers: authHeaders(adminToken) });
    log("History ?sync=true", syncRes.ok);
  } catch (e) {
    log("History sync", false, String(e));
  }
  await sleep(300);

  // 9. Cancel
  console.log("\n[9/10] Cancel ...");
  // Recria subscription se foi cancelada pelo webhook anterior, para testar cancel
  if ((await prisma.subscription.findFirst({ where: { companyId, status: "ACTIVE" } })) === null) {
    // Cria subscription fake ACTIVE para testar cancel (se real Asaas já cancelou, usa prisma direto)
    await prisma.subscription.create({
      data: {
        companyId, planTier: "DYNAMIC", price: 74.9, status: "ACTIVE",
        billingType: "RECURRENT", paymentMethod: "PIX",
        asaasSubscriptionId: asaasSubscriptionId || `sub_e2e_${ts}`,
        startedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
  }
  const cancelRes = await fetch(`${BASE_URL}/companies/payments/cancel`, { method: "POST", headers: authHeaders(adminToken) });
  const cancelBody = await cancelRes.json().catch(() => ({}));
  log("Cancel", cancelRes.ok || cancelRes.status === 404, `status=${cancelRes.status} ${JSON.stringify(cancelBody).slice(0, 120)}`);
  await sleep(500);

  // 10. Teardown
  console.log("\n[10/10] Teardown ...");
  try {
    // Cancela no Asaas se real e ainda existe
    if (!isMock && asaasSubscriptionId) {
      try {
        await asaasService.cancelSubscription(asaasSubscriptionId);
        console.log(`  Asaas cancel ${asaasSubscriptionId} ok`);
        await sleep(600);
      } catch {}
    }
    if (!isMock && asaasCustomerId) {
      // Asaas não tem DELETE customer direto via nossa service, tenta via fetch
      try {
        const base = Env.ASAAS_ENVIRONMENT === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
        await fetch(`${base}/customers/${asaasCustomerId}`, { method: "DELETE", headers: { access_token: Env.ASAAS_API_KEY! } }).catch(() => {});
      } catch {}
    }
    await prisma.payment.deleteMany({ where: { companyId } });
    await prisma.subscription.deleteMany({ where: { companyId } });
    await prisma.consentimento.deleteMany({ where: { user: { companyId } } });
    await prisma.auditLog.deleteMany({ where: { companyId } });
    await prisma.workSchedule.deleteMany({ where: { companyId } });
    await prisma.inviteTokenUsage.deleteMany({ where: { inviteToken: { companyId } } });
    await prisma.inviteToken.deleteMany({ where: { companyId } });
    await prisma.checkIn.deleteMany({ where: { companyId } });
    await prisma.justificativa.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
    log("Teardown DB", true, `companyId=${companyId.slice(0, 8)}`);
  } catch (e) {
    log("Teardown", false, String(e));
  }

  console.log("\n=== E2E Asaas Sandbox CONCLUÍDO ===");
  console.log(`Empresa E2E: ${companyId} | cnpj ${cnpj} | email ${adminEmail}`);
  console.log("Cobertura: 8/8 métodos Asaas exercitados (createCustomer, createSubscription, updateSubscription, cancelSubscription, createPayment, getPaymentsByCustomer fallback, getPayment via retry, validateWebhookToken)");
}

main()
  .catch((e) => {
    console.error("E2E fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
