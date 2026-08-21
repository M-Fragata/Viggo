import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: {
    company: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    checkIn: { findMany: vi.fn() },
  },
}));

vi.mock("../../../utils/cpfEncryption.js", () => ({
  decryptCpf: vi.fn().mockReturnValue("52998224725"),
}));

import { gerarRelatorioMensal, gerarRelatorioMensalPdf } from "../../../services/relatorioMensalService.js";
import { extendedPrisma } from "../../../database/prisma-extensions.js";

describe("relatorioMensalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCompany = {
    cnpj: "11222333000181",
    name: "Empresa Teste LTDA",
  };

  const mockEmployees = [
    { id: "user-1", name: "João Silva", cpf: "encrypted-cpf" },
  ];

  it("deve gerar relatório com headers do MTE", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.csv).toContain("EMPREGADOR: Empresa Teste LTDA");
    expect(result.csv).toContain("CNPJ: 11222333000181");
    expect(result.csv).toContain("PERIODO:");
  });

  it("deve incluir hash SHA-256 no rodapé", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.csv).toContain(`HASH: ${result.hash}`);
  });

  it("deve gerar nome de arquivo correto", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.filename).toBe("RELATORIO_MENSAL_11222333000181_202608.csv");
  });

  it("deve lançar erro quando empresa não possui CNPJ", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue({
      cnpj: null,
      name: "Sem CNPJ",
    });

    await expect(
      gerarRelatorioMensal("company-1", 2026, 8)
    ).rejects.toThrow("CNPJ da empresa é obrigatório");
  });

  it("deve lançar erro quando empresa não encontrada", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(null);

    await expect(
      gerarRelatorioMensal("nonexistent", 2026, 8)
    ).rejects.toThrow("CNPJ da empresa é obrigatório");
  });

  it("deve incluir funcionário no relatório", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.csv).toContain("FUNCIONARIO: João Silva");
    expect(result.csv).toContain("CPF: 52998224725");
  });

  it("deve incluir colunas de ponto (Dia|Sem|Entrada|...)", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.csv).toContain("Dia|Sem|Entrada|Saida Intervalo|Retorno Intervalo|Saida|Horas|Extras|Observacao");
  });

  it("deve incluir ASSINATURA no final de cada funcionário", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.csv).toContain("ASSINATURA: João Silva");
  });

  it("deve incluir checkins no relatório quando existem", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([
      {
        id: "checkin-1",
        userId: "user-1",
        type: "ENTRY",
        createdAt: new Date("2026-08-10T08:00:00"),
      },
      {
        id: "checkin-2",
        userId: "user-1",
        type: "EXIT",
        createdAt: new Date("2026-08-10T17:00:00"),
      },
    ]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.csv).toContain("08:00");
    expect(result.csv).toContain("17:00");
  });

  it("deve tratar múltiplos funcionários", async () => {
    const employees = [
      { id: "user-1", name: "João Silva", cpf: "cpf-1" },
      { id: "user-2", name: "Maria Santos", cpf: "cpf-2" },
    ];

    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(employees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.csv).toContain("FUNCIONARIO: João Silva");
    expect(result.csv).toContain("FUNCIONARIO: Maria Santos");
  });

  it("deve gerar hash diferente para meses diferentes", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result1 = await gerarRelatorioMensal("company-1", 2026, 7);
    const result2 = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result1.hash).not.toBe(result2.hash);
  });

  it("deve formatar CNPJ sem pontuação", async () => {
    (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
    (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
    (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);

    const result = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(result.csv).toContain("CNPJ: 11222333000181");
    expect(result.csv).not.toContain("CNPJ: 11.222.333/0001-81");
  });

  describe("gerarRelatorioMensalPdf", () => {
    beforeEach(() => {
      (extendedPrisma.company.findUnique as any).mockResolvedValue(mockCompany);
      (extendedPrisma.user.findMany as any).mockResolvedValue(mockEmployees);
      (extendedPrisma.checkIn.findMany as any).mockResolvedValue([]);
    });

    it("deve gerar um buffer PDF válido", async () => {
      const result = await gerarRelatorioMensalPdf("company-1", 2026, 8);

      expect(result.pdf.length).toBeGreaterThan(0);
      expect(result.pdf.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("deve usar o mesmo hash SHA-256 do CSV", async () => {
      const csv = await gerarRelatorioMensal("company-1", 2026, 8);
      const pdf = await gerarRelatorioMensalPdf("company-1", 2026, 8);

      expect(pdf.hash).toBe(csv.hash);
    });

    it("deve gerar nome de arquivo com extensão .pdf", async () => {
      const result = await gerarRelatorioMensalPdf("company-1", 2026, 8);

      expect(result.filename).toBe("RELATORIO_MENSAL_11222333000181_202608.pdf");
    });

    it("deve incluir título e hash no metadata do PDF", async () => {
      const result = await gerarRelatorioMensalPdf("company-1", 2026, 8);

      const raw = result.pdf.toString("latin1");
      expect(raw).toContain("Relatorio Mensal de Ponto");
      expect(raw).toContain(result.hash);
    });
  });
});
