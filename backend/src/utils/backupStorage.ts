import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { Env } from "./environment.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * B2 — Storage de backup AFD/AEJ
 * Modelo A: mensal versionado, local criptografado (plug-and-play).
 * Se S3_BUCKET configurado, pode plugar AWS SDK futuro sem mudar chamada — por enquanto cai no local.
 *
 * Criptografia: AES-256-GCM + nonce aleatório 12 bytes, envelope {v, ct, iv, tag} base64.
 * Chave: AFD_BACKUP_KEY hex 64 (32 bytes). Sem chave → erro explícito (não sobrescreve).
 */

function getBackupKey(): Buffer {
  if (!Env.AFD_BACKUP_KEY) {
    throw new Error("AFD_BACKUP_KEY não configurado — gere com: openssl rand -hex 32 e adicione no .env");
  }
  return Buffer.from(Env.AFD_BACKUP_KEY, "hex");
}

export function encryptBackup(plaintext: string): string {
  const key = getBackupKey();
  if (key.length !== 32) throw new Error("AFD_BACKUP_KEY deve ter 32 bytes (hex 64)");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    ct: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  });
}

export function decryptBackup(payload: string): string {
  const key = getBackupKey();
  const obj = JSON.parse(payload) as { v: number; ct: string; iv: string; tag: string };
  if (obj.v !== 1 || !obj.ct || !obj.iv || !obj.tag) throw new Error("Payload backup inválido");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(obj.iv, "base64"), {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(Buffer.from(obj.tag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(obj.ct, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}

export interface BackupMeta {
  key: string; // ex: {companyId}/afd/2026-08.txt.enc
  bytes: number;
  localPath: string;
}

/**
 * Salva backup criptografado.
 * - Se S3_BUCKET preenchido → tenta S3 (placeholder, hoje fallback local + warn)
 * - Senão → grava em AFD_BACKUP_DIR/{key}
 * Nunca sobrescreve sem versionamento: key já contém YYYY-MM, se existir sobrescreve o mês (idempotente).
 */
export function saveBackup(key: string, encryptedPayload: string): BackupMeta {
  // Futuro S3: if (Env.S3_BUCKET) { uploadToS3(...) ; return }
  if (Env.S3_BUCKET) {
    console.warn(`[BACKUP] S3_BUCKET=${Env.S3_BUCKET} configurado mas upload S3 ainda não plugado — salvando localmente em ${Env.AFD_BACKUP_DIR}`);
  }

  const baseDir = Env.AFD_BACKUP_DIR ?? "./backups";
  const fullPath = join(baseDir, key);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, encryptedPayload, "utf8");
  return { key, bytes: Buffer.byteLength(encryptedPayload, "utf8"), localPath: fullPath };
}

export function backupExists(key: string): boolean {
  const baseDir = Env.AFD_BACKUP_DIR ?? "./backups";
  return existsSync(join(baseDir, key));
}

export function readBackup(key: string): string {
  const baseDir = Env.AFD_BACKUP_DIR ?? "./backups";
  const fullPath = join(baseDir, key);
  const enc = readFileSync(fullPath, "utf8");
  return decryptBackup(enc);
}

export function listBackups(companyId: string): string[] {
  const baseDir = Env.AFD_BACKUP_DIR ?? "./backups";
  const dir = join(baseDir, companyId, "afd");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".enc")).sort();
}
