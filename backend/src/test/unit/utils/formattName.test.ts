import { describe, it, expect } from "vitest";
import { FormattName } from "../../../utils/formattName.js";

describe("FormattName", () => {
  it("deve capitalizar primeira letra de cada palavra", () => {
    expect(FormattName("maria silva")).toBe("Maria Silva");
  });

  it("deve manter conectores em minúsculo", () => {
    expect(FormattName("maria das silva")).toBe("Maria das Silva");
    expect(FormattName("joão de souza")).toBe("João de Souza");
    expect(FormattName("ana da silva")).toBe("Ana da Silva");
    expect(FormattName("pedro dos santos")).toBe("Pedro dos Santos");
    expect(FormattName("maria e joão")).toBe("Maria e João");
  });

  it("deve lidar com nomes compostos", () => {
    expect(FormattName("ana beatriz silva")).toBe("Ana Beatriz Silva");
    expect(FormattName("JOÃO PAULO")).toBe("João Paulo");
  });

  it("deve lidar com string vazia", () => {
    expect(FormattName("")).toBe("");
  });

  it("deve lidar com uma única palavra", () => {
    expect(FormattName("maria")).toBe("Maria");
    expect(FormattName("MARIA")).toBe("Maria");
  });

  it("deve lidar com múltiplos conectores", () => {
    expect(FormattName("maria das e dos silva")).toBe("Maria das e dos Silva");
  });

  it("deve normalizar caixa alta para lowercase antes de capitalizar", () => {
    expect(FormattName("MARIA SILVA")).toBe("Maria Silva");
    expect(FormattName("mARIA sILVA")).toBe("Maria Silva");
  });
});
