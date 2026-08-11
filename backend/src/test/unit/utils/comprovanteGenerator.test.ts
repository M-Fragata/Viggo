import { describe, it, expect, vi, beforeEach } from "vitest";
import { gerarComprovante } from "../../../utils/comprovanteGenerator.js";

describe("comprovanteGenerator", () => {
  const dadosValidos = {
    nsr: 1,
    companyName: "Empresa Teste LTDA",
    companyCnpj: "11222333000181",
    employeeName: "João Silva",
    employeeCpf: "52998224725",
    checkinType: "ENTRY",
    checkinDate: new Date("2026-08-10T08:00:00"),
    latitude: -23.5505,
    longitude: -46.6333,
  };

  describe("gerarComprovante", () => {
    it("deve gerar comprovante com texto e hash", () => {
      const result = gerarComprovante(dadosValidos);

      expect(result).toHaveProperty("texto");
      expect(result).toHaveProperty("hashVerificacao");
      expect(typeof result.texto).toBe("string");
      expect(typeof result.hashVerificacao).toBe("string");
    });

    it("deve incluir todos os campos obrigatórios no texto", () => {
      const result = gerarComprovante(dadosValidos);

      expect(result.texto).toContain("COMPROVANTE DE REGISTRO DE PONTO");
      expect(result.texto).toContain("Empresa Teste LTDA");
      expect(result.texto).toContain("João Silva");
      expect(result.texto).toContain("08:00:00");
      expect(result.texto).toContain("Entrada");
      expect(result.texto).toContain("000001"); // NSR formatado
    });

    it("deve formatar CNPJ corretamente", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.texto).toContain("11.222.333/0001-81");
    });

    it("deve formatar CPF corretamente", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.texto).toContain("529.982.247-25");
    });

    it("deve incluir localização com 6 casas decimais", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.texto).toContain("-23.550500");
      expect(result.texto).toContain("-46.633300");
    });

    it("deve gerar hash SHA-256 (64 hex chars)", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.hashVerificacao).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(result.hashVerificacao)).toBe(true);
    });

    it("deve incluir hash no final do texto", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.texto).toContain(`Hash: ${result.hashVerificacao}`);
    });

    it("deve gerar hash diferente para dados diferentes", () => {
      const r1 = gerarComprovante(dadosValidos);
      const r2 = gerarComprovante({ ...dadosValidos, nsr: 2 });
      expect(r1.hashVerificacao).not.toBe(r2.hashVerificacao);
    });

    it("deve gerar hash determinístico para mesmos dados", () => {
      const r1 = gerarComprovante(dadosValidos);
      const r2 = gerarComprovante({ ...dadosValidos });
      expect(r1.hashVerificacao).toBe(r2.hashVerificacao);
    });

    it("deve mapear todos os tipos de checkin", () => {
      const tipos = [
        { tipo: "ENTRY", esperado: "Entrada" },
        { tipo: "LUNCH_START", esperado: "Saida Intervalo" },
        { tipo: "LUNCH_END", esperado: "Retorno Intervalo" },
        { tipo: "EXIT", esperado: "Saida" },
      ];

      for (const { tipo, esperado } of tipos) {
        const result = gerarComprovante({ ...dadosValidos, checkinType: tipo });
        expect(result.texto).toContain(esperado);
      }
    });

    it("deve formatar NSR com zero padding (6 dígitos)", () => {
      const result = gerarComprovante({ ...dadosValidos, nsr: 42 });
      expect(result.texto).toContain("NSR:  000042");
    });

    it("deve formatar data no padrão dd/mm/yyyy", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.texto).toContain("Data: 10/08/2026");
    });
  });
});
