import { describe, it, expect } from "vitest";
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
    it("deve gerar comprovante com texto, hash e dados estruturados", () => {
      const result = gerarComprovante(dadosValidos);

      expect(result).toHaveProperty("texto");
      expect(result).toHaveProperty("hashVerificacao");
      expect(result).toHaveProperty("dados");
      expect(typeof result.texto).toBe("string");
      expect(typeof result.hashVerificacao).toBe("string");
      expect(typeof result.dados).toBe("object");
    });

    it("deve incluir todos os campos obrigatórios no texto", () => {
      const result = gerarComprovante(dadosValidos);

      expect(result.texto).toContain("Comprovante do Registro de Ponto");
      expect(result.texto).toContain("Empresa Teste LTDA");
      expect(result.texto).toContain("João Silva");
      expect(result.texto).toContain("08:00");
      expect(result.texto).toContain("000000001"); // NSR 9 dígitos
      expect(result.texto).toContain("Assinado digitalmente por:");
      expect(result.texto).toContain("Fragata Soluções Digitais LTDA");
    });

    it("deve formatar CNPJ corretamente", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.texto).toContain("11.222.333/0001-81");
    });

    it("deve formatar CPF corretamente", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.texto).toContain("529.982.247-25");
    });

    it("deve gerar hash SHA-256 em maiúsculo (64 hex chars)", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.hashVerificacao).toHaveLength(64);
      expect(/^[A-F0-9]{64}$/.test(result.hashVerificacao)).toBe(true);
    });

    it("deve incluir hash formatado em 2 linhas de 32 caracteres", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.dados.hashLinha1).toHaveLength(32);
      expect(result.dados.hashLinha2).toHaveLength(32);
      expect(result.texto).toContain(`Hash: ${result.dados.hashLinha1}\n      ${result.dados.hashLinha2}`);
    });

    it("deve gerar hash diferente para dados diferentes", () => {
      const r1 = gerarComprovante(dadosValidos);
      const r2 = gerarComprovante({ ...dadosValidos, nsr: 2 });
      expect(r1.hashVerificacao).not.toBe(r2.hashVerificacao);
    });

    it("deve gerar hash determinístico para mesmos dados e mesma data de emissão", () => {
      const fixedEmissao = new Date("2026-08-10T08:01:00");
      const r1 = gerarComprovante({ ...dadosValidos, emissaoDate: fixedEmissao });
      const r2 = gerarComprovante({ ...dadosValidos, emissaoDate: fixedEmissao });
      expect(r1.hashVerificacao).toBe(r2.hashVerificacao);
    });

    it("deve formatar NSR com zero padding de 9 dígitos conforme Portaria 671 REP-P", () => {
      const result = gerarComprovante({ ...dadosValidos, nsr: 42 });
      expect(result.texto).toContain("NSR:  000000042");
      expect(result.dados.nsr).toBe("000000042");
    });

    it("deve formatar data no padrão dd/mm/yyyy", () => {
      const result = gerarComprovante(dadosValidos);
      expect(result.texto).toContain("Data: 10/08/2026");
    });

    it("deve exibir Registro INPI quando fornecido e omitir quando vazio", () => {
      const comInpi = gerarComprovante({ ...dadosValidos, inpi: "BR512022001840-3" });
      expect(comInpi.texto).toContain("Registro INPI: BR512022001840-3");
      expect(comInpi.dados.inpi).toBe("BR512022001840-3");

      const semInpi = gerarComprovante({ ...dadosValidos, inpi: "" });
      expect(semInpi.texto).not.toContain("Registro INPI:");
      expect(semInpi.dados.inpi).toBeNull();
    });
  });
});
