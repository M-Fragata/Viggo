import { describe, it, expect, vi, beforeEach } from "vitest";
import { signContent, isSigned } from "../../../utils/afSignature.js";

describe("afSignature — B1 plug-and-play", () => {
  it("sem certificado → apenas hash, assinado=false", () => {
    const result = signContent("conteudo teste");
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.assinado).toBe(false);
    expect(result.assinatura).toBeUndefined();
    expect(isSigned(result)).toBe(false);
  });

  it("conteúdos diferentes geram hashes diferentes", () => {
    const a = signContent("a");
    const b = signContent("b");
    expect(a.hash).not.toBe(b.hash);
  });

  it("mesmo conteúdo gera mesmo hash (determinístico sem cert)", () => {
    const a = signContent("viggo");
    const b = signContent("viggo");
    expect(a.hash).toBe(b.hash);
    expect(a.assinado).toBe(false);
  });
});
