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

/**
 * Hash SHA-256(CPF + pepper) para lookup @unique.
 * Pepper = CPF_ENCRYPTION_KEY (mesma chave, separação de responsabilidades).
 */
export function hashCpf(cpfDigits: string): string {
  const pepper = Env.CPF_ENCRYPTION_KEY;
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
export function decryptCpf(input: string): string {
  // Compatibilidade: hex puro (legado CBC)
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
 */
function decryptLegacyCbc(encryptedHex: string): string {
  const key = getEncryptionKey();
  const iv = crypto.createHash("sha256").update(encryptedHex).digest().subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
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
