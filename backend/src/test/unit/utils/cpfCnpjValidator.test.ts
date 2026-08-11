import { describe, it, expect } from "vitest";
import {
  validateCPF,
  validateCNPJ,
  formatCPF,
  formatCNPJ,
  detectDocumentType,
  validateDocument,
  maskCPF,
  maskCNPJ,
  maskDocument,
  cleanDocument,
} from "../../../utils/cpfCnpjValidator.js";

describe("cpfCnpjValidator", () => {
  describe("cleanDocument", () => {
    it("deve remover pontuação de CPF", () => {
      expect(cleanDocument("529.982.247-25")).toBe("52998224725");
    });

    it("deve remover pontuação de CNPJ", () => {
      expect(cleanDocument("11.222.333/0001-81")).toBe("11222333000181");
    });

    it("deve retornar string vazia para input vazio", () => {
      expect(cleanDocument("")).toBe("");
    });

    it("deve manter apenas dígitos", () => {
      expect(cleanDocument("abc123def456")).toBe("123456");
    });
  });

  describe("validateCPF", () => {
    it.each([
      "529.982.247-25",
      "52998224725",
      "111.444.777-35",
      "11144477735",
    ])("deve validar CPF válido: %s", (cpf) => {
      expect(validateCPF(cpf)).toBe(true);
    });

    it.each([
      "000.000.000-00",
      "111.111.111-11",
      "222.222.222-22",
      "333.333.333-33",
      "444.444.444-44",
      "555.555.555-55",
      "666.666.666-66",
      "777.777.777-77",
      "888.888.888-88",
      "999.999.999-99",
    ])("deve rejeitar CPF com todos dígitos iguais: %s", (cpf) => {
      expect(validateCPF(cpf)).toBe(false);
    });

    it("deve rejeitar CPF com dígitos verificadores inválidos", () => {
      expect(validateCPF("529.982.247-00")).toBe(false);
      expect(validateCPF("529.982.247-99")).toBe(false);
      expect(validateCPF("111.444.777-00")).toBe(false);
    });

    it("deve rejeitar CPF com menos de 11 dígitos", () => {
      expect(validateCPF("123.456.789-0")).toBe(false);
      expect(validateCPF("123.456.789")).toBe(false);
      expect(validateCPF("1234567890")).toBe(false);
    });

    it("deve rejeitar CPF com mais de 11 dígitos", () => {
      expect(validateCPF("529.982.247-250")).toBe(false);
    });

    it("deve rejeitar string vazia", () => {
      expect(validateCPF("")).toBe(false);
    });
  });

  describe("validateCNPJ", () => {
    it.each([
      "11.222.333/0001-81",
      "11222333000181",
      "11.444.777/0001-61",
      "11444777000161",
    ])("deve validar CNPJ válido: %s", (cnpj) => {
      expect(validateCNPJ(cnpj)).toBe(true);
    });

    it("deve rejeitar CNPJ com dígitos verificadores inválidos", () => {
      expect(validateCNPJ("11.222.333/0001-00")).toBe(false);
      expect(validateCNPJ("11.222.333/0001-99")).toBe(false);
    });

    it("deve rejeitar CNPJ com todos dígitos iguais", () => {
      expect(validateCNPJ("00.000.000/0000-00")).toBe(false);
      expect(validateCNPJ("11.111.111/1111-11")).toBe(false);
    });

    it("deve rejeitar CNPJ com menos de 14 dígitos", () => {
      expect(validateCNPJ("12.345.678/0001-0")).toBe(false);
    });

    it("deve rejeitar string vazia", () => {
      expect(validateCNPJ("")).toBe(false);
    });
  });

  describe("formatCPF", () => {
    it("deve formatar CPF sem pontuação", () => {
      expect(formatCPF("52998224725")).toBe("529.982.247-25");
    });

    it("deve manter CPF já formatado", () => {
      expect(formatCPF("529.982.247-25")).toBe("529.982.247-25");
    });

    it("deve retornar input original se tamanho inválido", () => {
      expect(formatCPF("123")).toBe("123");
    });
  });

  describe("formatCNPJ", () => {
    it("deve formatar CNPJ sem pontuação", () => {
      expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    });

    it("deve manter CNPJ já formatado", () => {
      expect(formatCNPJ("11.222.333/0001-81")).toBe("11.222.333/0001-81");
    });

    it("deve retornar input original se tamanho inválido", () => {
      expect(formatCNPJ("123")).toBe("123");
    });
  });

  describe("detectDocumentType", () => {
    it("deve detectar CPF (11 dígitos)", () => {
      expect(detectDocumentType("52998224725")).toBe("CPF");
      expect(detectDocumentType("529.982.247-25")).toBe("CPF");
    });

    it("deve detectar CNPJ (14 dígitos)", () => {
      expect(detectDocumentType("11222333000181")).toBe("CNPJ");
      expect(detectDocumentType("11.222.333/0001-81")).toBe("CNPJ");
    });

    it("deve retornar INVALID para formato desconhecido", () => {
      expect(detectDocumentType("123")).toBe("INVALID");
      expect(detectDocumentType("")).toBe("INVALID");
      expect(detectDocumentType("12345678901234567890")).toBe("INVALID");
    });
  });

  describe("validateDocument", () => {
    it("deve validar e formatar CPF válido", () => {
      const result = validateDocument("52998224725");
      expect(result).toEqual({
        valid: true,
        type: "CPF",
        formatted: "529.982.247-25",
      });
    });

    it("deve validar e formatar CNPJ válido", () => {
      const result = validateDocument("11222333000181");
      expect(result).toEqual({
        valid: true,
        type: "CNPJ",
        formatted: "11.222.333/0001-81",
      });
    });

    it("deve retornar inválido para CPF com dígitos errados", () => {
      const result = validateDocument("12345678900");
      expect(result.valid).toBe(false);
      expect(result.type).toBe("CPF");
    });

    it("deve retornar INVALID para formato desconhecido", () => {
      const result = validateDocument("123");
      expect(result).toEqual({
        valid: false,
        type: "INVALID",
        formatted: "123",
      });
    });
  });

  describe("maskCPF", () => {
    it("deve mascarar CPF completo", () => {
      expect(maskCPF("52998224725")).toBe("529.982.247-25");
    });

    it("deve mascarar CPF parcial (6 dígitos)", () => {
      expect(maskCPF("529982")).toBe("529.982");
    });

    it("deve mascarar CPF parcial (3 dígitos)", () => {
      expect(maskCPF("529")).toBe("529");
    });

    it("deve retornar input original se menor que 3 dígitos", () => {
      expect(maskCPF("12")).toBe("12");
    });
  });

  describe("maskCNPJ", () => {
    it("deve mascarar CNPJ completo", () => {
      expect(maskCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    });

    it("deve mascarar CNPJ parcial (8 dígitos)", () => {
      expect(maskCNPJ("11222333")).toBe("11.222.333");
    });

    it("deve mascarar CNPJ parcial (5 dígitos)", () => {
      expect(maskCNPJ("11222")).toBe("11.222");
    });

    it("deve retornar input original se menor que 2 dígitos", () => {
      expect(maskCNPJ("1")).toBe("1");
    });
  });

  describe("maskDocument", () => {
    it("deve mascarar CPF", () => {
      expect(maskDocument("52998224725")).toBe("529.982.247-25");
    });

    it("deve mascarar CNPJ", () => {
      expect(maskDocument("11222333000181")).toBe("11.222.333/0001-81");
    });

    it("deve retornar input original para formato inválido", () => {
      expect(maskDocument("123")).toBe("123");
    });
  });
});
