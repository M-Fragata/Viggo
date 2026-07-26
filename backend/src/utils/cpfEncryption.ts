import crypto from "node:crypto";
import { Env } from "./environment.js";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = Buffer.from(Env.CPF_ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("CPF_ENCRYPTION_KEY deve ser uma chave hex de 64 caracteres (32 bytes)");
  }
  return key;
}

/**
 * Deriva um IV determinístico a partir do CPF.
 * Isso garante que o mesmo CPF sempre gera o mesmo ciphertext,
 * permitindo constraint @unique no banco.
 */
function deriveIv(cpf: string): Buffer {
  return crypto.createHash("sha256").update(cpf).digest().subarray(0, IV_LENGTH);
}

/**
 * Criptografa um CPF usando AES-256-CBC com IV determinístico.
 * @param cpf - CPF em texto limpo (11 dígitos, ex: "12345678909")
 * @returns CPF criptografado em hexadecimal
 */
export function encryptCpf(cpf: string): string {
  const key = getKey();
  const iv = deriveIv(cpf);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(cpf, "utf8"), cipher.final()]);
  return encrypted.toString("hex");
}

/**
 * Descriptografa um CPF criptografado com AES-256-CBC.
 * @param encryptedHex - CPF criptografado em hexadecimal
 * @returns CPF em texto limpo (11 dígitos)
 */
export function decryptCpf(encryptedHex: string): string {
  const key = getKey();
  const iv = deriveIv(encryptedHex);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
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
export function decryptAndFormat(encryptedHex: string): string {
  const cpf = decryptCpf(encryptedHex);
  return formatCpfDigits(cpf);
}

/**
 * Descriptografa um CPF e retorna apenas dígitos.
 */
export function decryptToDigits(encryptedHex: string): string {
  return decryptCpf(encryptedHex).replace(/\D/g, "");
}
