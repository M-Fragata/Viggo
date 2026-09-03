import crypto from "node:crypto";
import { Env } from "./environment.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const FORMAT_VERSION = 1;

function getEncryptionKey(): Buffer {
  const key = Buffer.from(Env.CPF_ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("CPF_ENCRYPTION_KEY deve ser uma chave hex de 64 caracteres (32 bytes)");
  }
  return key;
}

function getHashPepper(): string {
  // A5: pepper distinto — se não setado, fallback p/ retrocompat (DB vazio ou migração pendente) com WARN
  const pepper = (Env as any).CPF_HASH_PEPPER as string | undefined;
  if (pepper && /^[0-9a-fA-F]{64}$/.test(pepper)) return pepper;
  if (pepper) console.warn("⚠️ CPF_HASH_PEPPER inválido, usando CPF_ENCRYPTION_KEY como fallback");
  return Env.CPF_ENCRYPTION_KEY;
}

/**
 * Hash SHA-256(CPF + pepper) para lookup @unique.
 * A5: pepper = CPF_HASH_PEPPER (distinto do AES). Se não setado, fallback p/ CPF_ENCRYPTION_KEY.
 */
export function hashCpf(cpfDigits: string): string {
  const pepper = getHashPepper();
  return crypto.createHash("sha256").update(cpfDigits + pepper).digest("hex");
}

/**
 * Criptografa um CPF usando AES-256-GCM com nonce aleatório.
 * @param cpfDigits - CPF em texto limpo (11 dígitos, ex: "12345678909")
 * @returns JSON string: { v, ct, iv, tag }
 */
export function encryptCpf(cpfDigits: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(cpfDigits, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    v: FORMAT_VERSION,
    ct: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  });
}

/**
 * Descriptografa um CPF criptografado com AES-256-GCM.
 * Compatível com formato legado (hex puro CBC) para transição.
 * @param input - JSON string { v, ct, iv, tag } ou hex legado
 * @returns CPF em texto limpo (11 dígitos)
 */
export function decryptCpf(input: string | null | undefined): string {
  if (!input || typeof input !== "string" || input.trim() === "") {
    return "";
  }

  // Compatibilidade: hex puro (legado CBC) ou texto puro
  if (!input.startsWith("{")) {
    return decryptLegacyCbc(input);
  }

  const payload = JSON.parse(input) as {
    v: number;
    ct: string;
    iv: string;
    tag: string;
  };

  if (payload.v !== FORMAT_VERSION) {
    throw new Error(`CPF versão desconhecida: ${payload.v}`);
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "hex"),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ct, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Descriptografa formato legado CBC (hex puro) para transição.
 * Se o input não for um hexadecimal de bloco CBC válido (mínimo 32 hex chars),
 * trata como texto puro (ex: CPF já descriptografado ou não formatado).
 */
function decryptLegacyCbc(encryptedHex: string): string {
  if (!encryptedHex || typeof encryptedHex !== "string" || encryptedHex.trim() === "") {
    return "";
  }

  const cleanHex = encryptedHex.trim();

  // Se não for hexadecimal válido ou não tiver múltiplos de bloco AES (16 bytes = 32 hex chars),
  // retorna como texto limpo (ex: "52998224725")
  if (!/^[0-9a-fA-F]+$/.test(cleanHex) || cleanHex.length < 32 || cleanHex.length % 32 !== 0) {
    return cleanHex;
  }

  const key = getEncryptionKey();
  const iv = crypto.createHash("sha256").update(cleanHex).digest().subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cleanHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Formata um CPF limpo (11 dígitos) no padrão XXX.XXX.XXX-XX.
 */
export function formatCpfDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean.length !== 11) return digits;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

/**
 * Descriptografa um CPF e retorna formatado (XXX.XXX.XXX-XX).
 */
export function decryptAndFormat(input: string): string {
  const cpf = decryptCpf(input);
  return formatCpfDigits(cpf);
}

/**
 * Descriptografa um CPF e retorna apenas dígitos.
 */
export function decryptToDigits(input: string): string {
  return decryptCpf(input).replace(/\D/g, "");
}
