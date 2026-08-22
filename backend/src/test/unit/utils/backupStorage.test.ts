import { describe, it, expect, beforeEach, vi } from "vitest";
import { existsSync, rmSync } from "node:fs";

// Mock Env before importing backupStorage
vi.mock("../../../utils/environment.js", () => ({
  Env: {
    AFD_BACKUP_KEY: "a".repeat(64), // 32 bytes hex
    AFD_BACKUP_DIR: "./backups-test",
    S3_BUCKET: undefined,
  },
}));

import { encryptBackup, decryptBackup, saveBackup, backupExists, readBackup } from "../../../utils/backupStorage.js";

describe("backupStorage — B2 Modelo A", () => {
  const testKey = "test-company/afd/2026-08.txt.enc";

  beforeEach(() => {
    if (existsSync("./backups-test")) rmSync("./backups-test", { recursive: true, force: true });
  });

  it("criptografa e descriptografa com AES-GCM", () => {
    const plain = "1|11222333000181||Empresa|10/08/2026 00:00:00|10/08/2026 23:59:59\n9|11222333000181|000001\nHASH: abc";
    const enc = encryptBackup(plain);
    const obj = JSON.parse(enc);
    expect(obj.v).toBe(1);
    expect(obj.ct).toBeDefined();
    expect(obj.iv).toBeDefined();
    expect(obj.tag).toBeDefined();
    expect(decryptBackup(enc)).toBe(plain);
  });

  it("mesmo conteúdo gera ciphertext diferente (nonce aleatório)", () => {
    const plain = "conteudo afd";
    const a = encryptBackup(plain);
    const b = encryptBackup(plain);
    expect(a).not.toBe(b);
    expect(decryptBackup(a)).toBe(plain);
    expect(decryptBackup(b)).toBe(plain);
  });

  it("saveBackup cria arquivo local e readBackup recupera", () => {
    const plain = "AFD teste conteudo";
    const enc = encryptBackup(plain);
    const meta = saveBackup(testKey, enc);
    expect(meta.key).toBe(testKey);
    expect(meta.bytes).toBeGreaterThan(0);
    expect(backupExists(testKey)).toBe(true);
    expect(readBackup(testKey)).toBe(plain);
  });

  it("backupExists retorna false para chave inexistente", () => {
    expect(backupExists("inexistente/2026-01.txt.enc")).toBe(false);
  });
});
