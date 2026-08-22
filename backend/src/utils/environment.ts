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
    // A5: pepper distinto para hash — nunca reutilizar a mesma chave do AES
    CPF_HASH_PEPPER: z.string().refine(
        (val) => /^[0-9a-fA-F]{64}$/.test(val),
        "CPF_HASH_PEPPER deve ser uma string hex de 64 caracteres (32 bytes) — gere com: openssl rand -hex 32"
    ).optional(),
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
    // B2: Backup AFD/AEJ mensal — plug-and-play (local criptografado, pronto p/ S3 futuro)
    AFD_BACKUP_KEY: z
        .string()
        .optional()
        .refine(
            (v) => !v || /^[0-9a-fA-F]{64}$/.test(v),
            "AFD_BACKUP_KEY deve ser hex 64 (32 bytes) — gere com: openssl rand -hex 32"
        ),
    AFD_BACKUP_DIR: z.string().optional().default("./backups"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
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