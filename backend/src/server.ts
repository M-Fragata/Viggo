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

app.listen(PORT);