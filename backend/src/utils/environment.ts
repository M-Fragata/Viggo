import "dotenv/config";
import z from "zod"

const environmentSchema = z.object({
    PORT: z.coerce.number(),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string(),
    FRONTEND_URL: z.string(),
    NODE_ENV: z.enum(["DEV", "PROD", "TEST"]).default("DEV")
})

const EnvRaw = environmentSchema.safeParse(process.env)

if (!EnvRaw.success) {
    console.error("❌ Erro na validação das variáveis de ambiente:");
    EnvRaw.error.issues.forEach((issue) => {
        console.error(`- ${issue.path.join('.')}: ${issue.message}`);
    });

    process.exit(1);
}

export const Env = EnvRaw.data