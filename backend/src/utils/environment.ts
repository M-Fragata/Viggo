import "dotenv/config";
import z from "zod"

const environmentSchema = z.object({
    PORT: z.coerce.number().default(3333),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string(),
    FRONTEND_URL: z.string(),
    CPF_ENCRYPTION_KEY: z.string().refine(
        (val) => /^[0-9a-fA-F]{64}$/.test(val),
        "CPF_ENCRYPTION_KEY deve ser uma string hex de 64 caracteres (32 bytes)"
    ),
    FACE_ENCRYPTION_KEY: z.string().refine(
        (val) => /^[0-9a-fA-F]{64}$/.test(val),
        "FACE_ENCRYPTION_KEY deve ser uma string hex de 64 caracteres (32 bytes)"
    ),
    NODE_ENV: z.enum(["DEV", "PROD", "TEST"]),
    ASAAS_API_KEY: z.string().optional(),
    ASAAS_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
    ASAAS_WEBHOOK_TOKEN: z.string().optional(),
    CERT_A1_PATH: z.string().optional(),
    CERT_A1_PASSWORD: z.string().optional(),
    CERT_A1_BASE64: z.string().optional(),
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