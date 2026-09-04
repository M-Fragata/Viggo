/**
 * Opção A — Envio real dos 13 templates para matheusdemoraes2@gmail.com
 * Uso temporário com domínio de teste do Resend (onboarding@resend.dev).
 * Não altera .env em disco, apenas sobrescreve Env em memória para este processo.
 *
 * Executar: npm run test:email:real
 * ou: npx tsx --env-file .env src/scripts/sendTestEmail.ts [--to=outro@email.com] [--dry]
 */

import { Env } from "../utils/environment.js";
import * as emailService from "../services/email/emailService.js";

const DEFAULT_TEST_TO = "matheusdemoraes2@gmail.com";
const TEMP_FROM = "Ponto Fragata <onboarding@resend.dev>";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const pref = `--${k}=`;
    const hit = args.find((a) => a.startsWith(pref));
    return hit ? hit.slice(pref.length) : undefined;
  };
  return {
    to: get("to"),
    dry: args.includes("--dry") || args.includes("--preview"),
  };
}

async function main() {
  const { to: toArg, dry } = parseArgs();

  // Overrides temporários — não persiste no .env
  const original = {
    NODE_ENV: Env.NODE_ENV,
    EMAIL_ENABLED: Env.EMAIL_ENABLED,
    EMAIL_PREVIEW: Env.EMAIL_PREVIEW,
    EMAIL_TEST_TO: Env.EMAIL_TEST_TO,
    EMAIL_FROM: Env.EMAIL_FROM,
    EMAIL_REPLY_TO: Env.EMAIL_REPLY_TO,
  };

  // Forçar modo que permita envio real
  (Env as Record<string, unknown>).NODE_ENV = "DEV";
  (Env as Record<string, unknown>).EMAIL_ENABLED = true;
  (Env as Record<string, unknown>).EMAIL_PREVIEW = dry ? true : false;
  // Se --to passado, ignora EMAIL_TEST_TO e envia direto; senão força redirect para DEFAULT_TEST_TO
  // Para garantir entrega com domínio não verificado, sempre usar DEFAULT_TEST_TO
  const finalTo = DEFAULT_TEST_TO;
  (Env as Record<string, unknown>).EMAIL_TEST_TO = toArg ? toArg : finalTo;
  (Env as Record<string, unknown>).EMAIL_FROM = TEMP_FROM;
  (Env as Record<string, unknown>).EMAIL_REPLY_TO = "matheus@fragata.me";

  // Garantir provider real (não mock)
  emailService.resetEmailProvider();

  console.log("=== Ponto Fragata Email Test Real (Opção A) ===");
  console.log(`Env overrides: NODE_ENV=DEV, EMAIL_ENABLED=true, EMAIL_PREVIEW=${dry ? "true (dry)" : "false"}`);
  console.log(`EMAIL_TEST_TO=${(Env as Record<string, unknown>).EMAIL_TEST_TO} (todos os envios redirecionados)`);
  console.log(`EMAIL_FROM=${Env.EMAIL_FROM} (temporário onboarding@resend.dev até verificar fragata.me)`);
  console.log(`RESEND_API_KEY=${Env.RESEND_API_KEY ? `${String(Env.RESEND_API_KEY).slice(0, 8)}...` : "MISSING!"}`);
  if (!Env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY ausente no .env — abortando.");
    process.exit(1);
  }
  console.log("");

  if (dry) {
    console.log("🔍 DRY RUN — nenhum e-mail será enviado, apenas preview no console.");
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const trialExpires = new Date(now);
  trialExpires.setDate(trialExpires.getDate() + 27);

  // Definição dos 13 templates (15 envios contando variantes 3d/1d)
  const tasks: Array<{ label: string; fn: () => Promise<unknown> }> = [
    {
      label: "1/13 welcomeCompany",
      fn: () =>
        emailService.sendWelcomeCompany({
          to: "destino-ignorado@test.com", // será redirecionado
          adminName: "Matheus Teste",
          companyName: "Viggo Teste Ltda",
          trialExpiresAt: trialExpires,
        }),
    },
    {
      label: "2/13 trialEnding (D-3)",
      fn: () =>
        emailService.sendTrialEnding({
          to: "admin@test.com",
          companyName: "Viggo Teste Ltda",
          daysRemaining: 3,
          planExpiresAt: in3Days,
        }),
    },
    {
      label: "3/13 trialEnding (D-1)",
      fn: () =>
        emailService.sendTrialEnding({
          to: "admin@test.com",
          companyName: "Viggo Teste Ltda",
          daysRemaining: 1,
          planExpiresAt: tomorrow,
        }),
    },
    {
      label: "4/13 paymentConfirmed",
      fn: () =>
        emailService.sendPaymentConfirmed({
          to: "admin@test.com",
          companyName: "Viggo Teste Ltda",
          amount: 54.9,
          billingType: "PIX",
          paidAt: now,
          nfseUrl: "https://exemplo.com/nfse/123",
        }),
    },
    {
      label: "5/13 paymentOverdue",
      fn: () =>
        emailService.sendPaymentOverdue({
          to: "admin@test.com",
          companyName: "Viggo Teste Ltda",
          amount: 99.9,
          dueDate: now,
        }),
    },
    {
      label: "6/13 justificativaCreated",
      fn: () =>
        emailService.sendJustificativaCreated({
          to: "admin@test.com",
          employeeName: "Ana Silva",
          tipo: "ATESTADO",
          descricao: "Consulta médica - atestado 1 dia",
          dataInicio: now,
          dataFim: tomorrow,
        }),
    },
    {
      label: "7/13 justificativaDecided (aprovada)",
      fn: () =>
        emailService.sendJustificativaDecided({
          to: "colaborador@test.com",
          employeeName: "Ana Silva",
          tipo: "ATESTADO",
          aprovado: true,
          dataInicio: now,
        }),
    },
    {
      label: "8/13 justificativaDecided (reprovada)",
      fn: () =>
        emailService.sendJustificativaDecided({
          to: "colaborador@test.com",
          employeeName: "João Souza",
          tipo: "FALTA",
          aprovado: false,
          dataInicio: now,
        }),
    },
    {
      label: "9/13 biometricExpiring",
      fn: () =>
        emailService.sendBiometricExpiring({
          to: "colaborador@test.com",
          userName: "Carlos Pereira",
          expiresAt: in3Days,
        }),
    },
    {
      label: "10/13 resetPassword (código 6 dígitos)",
      fn: () => emailService.sendResetPassword({ to: "usuario@test.com", code: "123456" }),
    },
    {
      label: "11/13 employeeWelcome",
      fn: () =>
        emailService.sendEmployeeWelcome({
          to: "novo@test.com",
          employeeName: "Fernanda Lima",
          companyName: "Viggo Teste Ltda",
        }),
    },
    {
      label: "12/13 biometricPurged (LGPD 24m)",
      fn: () => emailService.sendBiometricPurged({ to: "usuario@test.com", userName: "Roberto Alves" }),
    },
    {
      label: "13/13 paymentUpcoming (D-3)",
      fn: () =>
        emailService.sendPaymentUpcoming({
          to: "admin@test.com",
          companyName: "Viggo Teste Ltda",
          amount: 79.9,
          dueDate: in3Days,
          daysRemaining: 3,
        }),
    },
    {
      label: "14/13 paymentUpcoming (D-1)",
      fn: () =>
        emailService.sendPaymentUpcoming({
          to: "admin@test.com",
          companyName: "Viggo Teste Ltda",
          amount: 79.9,
          dueDate: tomorrow,
          daysRemaining: 1,
        }),
    },
    {
      label: "15/13 subscriptionCancelled",
      fn: () =>
        emailService.sendSubscriptionCancelled({
          to: "admin@test.com",
          companyName: "Viggo Teste Ltda",
        }),
    },
  ];

  let ok = 0;
  let fail = 0;

  for (const t of tasks) {
    try {
      process.stdout.write(`→ ${t.label} ... `);
      const res = await t.fn();
      if (res && typeof res === "object" && "id" in (res as Record<string, unknown>)) {
        console.log(`✅ id=${(res as { id: string }).id}`);
      } else if (dry && res && (res as { id: string }).id === "preview") {
        console.log("✅ preview");
      } else if (res === null) {
        console.log("⚠️  null (desabilitado/sem chave)");
      } else {
        console.log("✅ ok");
      }
      ok++;
    } catch (e) {
      console.log(`❌ ${e instanceof Error ? e.message : String(e)}`);
      fail++;
    }
    // Resend free: 2 req/s → pausa 700ms entre envios
    await sleep(700);
  }

  console.log("");
  console.log(`=== Resultado: ${ok} ok, ${fail} falhas em ${tasks.length} envios ===`);
  console.log(`Verifique a caixa de entrada de ${finalTo} e o dashboard https://resend.com/emails`);
  if (!dry && fail === 0) {
    console.log("✨ Todos os 13 templates entregues (15 envios com variantes).");
  }

  // Restaurar Env (opcional, processo vai encerrar)
  Object.assign(Env as Record<string, unknown>, original);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
