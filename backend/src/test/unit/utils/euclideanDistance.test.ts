import { describe, it, expect } from "vitest";
import {
  euclideanDistance,
} from "../../../utils/euclideanDistance.js";

describe("euclideanDistance", () => {
  it("deve retornar 0 para vetores idênticos", () => {
    const a = [0.5, 0.5, 0.5, 0.5];
    const b = [0.5, 0.5, 0.5, 0.5];
    expect(euclideanDistance(a, b)).toBe(0);
  });

  it("deve calcular distância corretamente (3-4-5)", () => {
    const a = [0, 0];
    const b = [3, 4];
    expect(euclideanDistance(a, b)).toBe(5);
  });

  it("deve ser simétrica", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(euclideanDistance(a, b)).toBe(euclideanDistance(b, a));
  });

  it("deve retornar valor positivo para vetores diferentes", () => {
    const a = [1, 2];
    const b = [3, 4];
    expect(euclideanDistance(a, b)).toBeGreaterThan(0);
  });

  it("deve funcionar com Float32Array", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(euclideanDistance(a, b)).toBeCloseTo(Math.sqrt(2));
  });

  it("deve usar Math.min quando arrays têm tamanhos diferentes", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [1, 2];
    // Só compara os 2 primeiros elementos: sqrt((1-1)^2 + (2-2)^2) = 0
    expect(euclideanDistance(a, b)).toBe(0);
  });

  it("deve retornar 0 para arrays vazios", () => {
    expect(euclideanDistance([], [])).toBe(0);
  });

  it("deve calcular distância euclidiana de 128 dimensões", () => {
    const a = new Array(128).fill(0);
    const b = new Array(128).fill(1);
    expect(euclideanDistance(a, b)).toBeCloseTo(Math.sqrt(128));
  });
});
