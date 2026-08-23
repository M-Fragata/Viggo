import { app } from './app.js';
import { Env } from './utils/environment.js'
import cron from "node-cron";
import { runRetentionCleanup } from "./scripts/retentionCleanup.js";

const PORT = Env.PORT

app.use((err: any, req: any, res: any, next: any) => {
  console.error("=== ERRO NO SERVIDOR ===");
  console.error(err);
  res.status(500).json({
    message: "Erro interno do servidor"
  });
});

// F19: Job de retenção e limpeza de dados — diariamente às 02:00
cron.schedule("0 2 * * *", async () => {
  console.log("[Cron] Iniciando retention cleanup...");
  try {
    await runRetentionCleanup();
    console.log("[Cron] Retention cleanup concluído.");
  } catch (error) {
    console.error("[Cron] Erro no retention cleanup:", error);
  }
});

// B2: Backup AFD mensal Modelo A — dia 01 às 03:00 (mês anterior), local criptografado
cron.schedule("0 3 1 * *", async () => {
  console.log("[Cron] Iniciando backup AFD mensal (Modelo A)...");
  try {
    const { runAfdBackup } = await import("./scripts/afdBackup.js");
    await runAfdBackup();
    console.log("[Cron] Backup AFD mensal concluído.");
  } catch (error) {
    console.error("[Cron] Erro no backup AFD mensal:", error);
  }
});

// E-mail: Trial acabando D-3 / D-1 — diariamente às 09:00
cron.schedule("0 9 * * *", async () => {
  console.log("[Cron] Iniciando trial ending job...");
  try {
    const { runTrialEndingJob } = await import("./jobs/trialEndingJob.js");
    const result = await runTrialEndingJob();
    console.log("[Cron] Trial ending concluído:", result);
  } catch (error) {
    console.error("[Cron] Erro no trial ending:", error);
  }
});

// E-mail: Biometria expirando (30d antes) — diariamente às 09:30
cron.schedule("30 9 * * *", async () => {
  console.log("[Cron] Iniciando biometric expiring job...");
  try {
    const { runBiometricExpiringJob } = await import("./jobs/biometricExpiringJob.js");
    const result = await runBiometricExpiringJob();
    console.log("[Cron] Biometric expiring concluído:", result);
  } catch (error) {
    console.error("[Cron] Erro no biometric expiring:", error);
  }
});

// E-mail: Pagamento próximo vencimento D-3 / D-1 — diariamente às 08:00
cron.schedule("0 8 * * *", async () => {
  console.log("[Cron] Iniciando payment upcoming job...");
  try {
    const { runPaymentUpcomingJob } = await import("./jobs/paymentUpcomingJob.js");
    const result = await runPaymentUpcomingJob();
    console.log("[Cron] Payment upcoming concluído:", result);
  } catch (error) {
    console.error("[Cron] Erro no payment upcoming:", error);
  }
});

app.listen(PORT);