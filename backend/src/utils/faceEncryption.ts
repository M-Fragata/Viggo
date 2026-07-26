import crypto from "node:crypto";
import { Env } from "./environment.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const FORMAT_VERSION = 1;

/**
 * Serializa um array de floats (128 dimensões) em Buffer little-endian.
 */
function descriptorToBuffer(descriptor: number[] | Float32Array): Buffer {
  const buf = Buffer.alloc(descriptor.length * 4);
  for (let i = 0; i < descriptor.length; i++) {
    buf.writeFloatLE(descriptor[i] as number, i * 4);
  }
  return buf;
}

/**
 * Deserializa Buffer em Float32Array.
 */
function bufferToDescriptor(buf: Buffer): Float32Array {
  const arr = new Float32Array(buf.length / 4);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = buf.readFloatLE(i * 4);
  }
  return arr;
}

function getKey(): Buffer {
  return Buffer.from(Env.FACE_ENCRYPTION_KEY, "hex");
}

/**
 * Criptografa um descriptor facial com AES-256-GCM.
 * Retorna JSON string: { v, ct, iv, tag }
 */
export function encryptFaceDescriptor(
  descriptor: number[] | Float32Array
): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const plaintext = descriptorToBuffer(descriptor);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload = {
    v: FORMAT_VERSION,
    ct: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };

  return JSON.stringify(payload);
}

/**
 * Descriptografa um descriptor facial armazenado como JSON.
 */
export function decryptFaceDescriptor(encryptedJson: string): Float32Array {
  const payload = JSON.parse(encryptedJson) as {
    v: number;
    ct: string;
    iv: string;
    tag: string;
  };

  if (payload.v !== FORMAT_VERSION) {
    throw new Error(`faceDescriptor versão desconhecida: ${payload.v}`);
  }

  const key = getKey();
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

  return bufferToDescriptor(decrypted);
}

/**
 * Verifica se um valor não-nulo contém um descriptor criptografado válido.
 * Não descriptografa — apenas valida estrutura JSON.
 */
export function hasFaceDescriptor(
  value: string | null | undefined
): boolean {
  if (!value) return false;
  try {
    const payload = JSON.parse(value);
    return (
      payload.v === FORMAT_VERSION &&
      typeof payload.ct === "string" &&
      typeof payload.iv === "string" &&
      typeof payload.tag === "string"
    );
  } catch {
    return false;
  }
}
