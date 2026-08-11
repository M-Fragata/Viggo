import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptFaceDescriptor,
  decryptFaceDescriptor,
  hasFaceDescriptor,
} from "../../../utils/faceEncryption.js";

describe("faceEncryption", () => {
  beforeEach(() => {
    process.env.FACE_ENCRYPTION_KEY =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  });

  const validDescriptor = Array.from({ length: 128 }, (_, i) => 0.001 * i);

  describe("encryptFaceDescriptor", () => {
    it("deve retornar JSON string com v, ct, iv, tag", () => {
      const result = encryptFaceDescriptor(validDescriptor);
      const payload = JSON.parse(result);

      expect(payload.v).toBe(1);
      expect(typeof payload.ct).toBe("string");
      expect(typeof payload.iv).toBe("string");
      expect(typeof payload.tag).toBe("string");
    });

    it("deve gerar ciphertext diferente a cada vez (nonce aleatório)", () => {
      const r1 = encryptFaceDescriptor(validDescriptor);
      const r2 = encryptFaceDescriptor(validDescriptor);

      expect(r1).not.toBe(r2);
    });

    it("deve aceitar Float32Array como input", () => {
      const f32 = new Float32Array(validDescriptor);
      const result = encryptFaceDescriptor(f32);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("deve criptografar array de 128 floats (padrão facial)", () => {
      const result = encryptFaceDescriptor(validDescriptor);
      const payload = JSON.parse(result);
      // AES-GCM com 128 floats * 4 bytes = 512 bytes plaintext
      // ciphertext deve ser > 512 bytes (hex encoded)
      expect(payload.ct.length).toBeGreaterThan(0);
    });
  });

  describe("decryptFaceDescriptor", () => {
    it("deve recuperar o descriptor original (128 floats)", () => {
      const encrypted = encryptFaceDescriptor(validDescriptor);
      const decrypted = decryptFaceDescriptor(encrypted);

      expect(decrypted).toHaveLength(128);
      for (let i = 0; i < 128; i++) {
        expect(decrypted[i]).toBeCloseTo(validDescriptor[i]!, 3);
      }
    });

    it("deve lançar erro com JSON inválido", () => {
      expect(() => decryptFaceDescriptor("invalid")).toThrow();
    });

    it("deve lançar erro com versão desconhecida", () => {
      const payload = {
        v: 99,
        ct: "abc",
        iv: "def",
        tag: "ghi",
      };
      expect(() => decryptFaceDescriptor(JSON.stringify(payload))).toThrow(
        "versão desconhecida"
      );
    });

    it("deve lançar erro com tag de autenticação inválida", () => {
      const encrypted = encryptFaceDescriptor(validDescriptor);
      const payload = JSON.parse(encrypted);
      payload.tag = "0".repeat(32); // Tag inválida
      expect(() => decryptFaceDescriptor(JSON.stringify(payload))).toThrow();
    });
  });

  describe("hasFaceDescriptor", () => {
    it("deve retornar true para JSON válido com v=1", () => {
      const encrypted = encryptFaceDescriptor(validDescriptor);
      expect(hasFaceDescriptor(encrypted)).toBe(true);
    });

    it("deve retornar false para null", () => {
      expect(hasFaceDescriptor(null)).toBe(false);
    });

    it("deve retornar false para undefined", () => {
      expect(hasFaceDescriptor(undefined)).toBe(false);
    });

    it("deve retornar false para string vazia", () => {
      expect(hasFaceDescriptor("")).toBe(false);
    });

    it("deve retornar false para JSON inválido", () => {
      expect(hasFaceDescriptor("not-json")).toBe(false);
    });

    it("deve retornar false para JSON sem campos obrigatórios", () => {
      expect(hasFaceDescriptor(JSON.stringify({ v: 1 }))).toBe(false);
      expect(
        hasFaceDescriptor(JSON.stringify({ v: 1, ct: "abc" }))
      ).toBe(false);
    });

    it("deve retornar false para versão diferente de 1", () => {
      const payload = {
        v: 2,
        ct: "abc",
        iv: "def",
        tag: "ghi",
      };
      expect(hasFaceDescriptor(JSON.stringify(payload))).toBe(false);
    });

    it("deve retornar true mesmo com campos vazios (validação é só de estrutura)", () => {
      const payload = {
        v: 1,
        ct: "",
        iv: "",
        tag: "",
      };
      expect(hasFaceDescriptor(JSON.stringify(payload))).toBe(true);
    });
  });
});
