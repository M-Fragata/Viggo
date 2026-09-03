import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startOfWeek, endOfWeek } from "date-fns";

const mockExtendedPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  company: { findUnique: vi.fn() },
  checkIn: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
  workSchedule: { findUnique: vi.fn() },
  workLocation: { findMany: vi.fn().mockResolvedValue([]) },
  justificativa: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../../../database/prisma-extensions.js", () => ({
  extendedPrisma: mockExtendedPrisma,
}));

vi.mock("../../../utils/nsrGenerator.js", () => ({
  getNextNSR: vi.fn().mockResolvedValue(1),
  currentYear: vi.fn().mockReturnValue(2026),
  NsrLimitExceededError: class NsrLimitExceededError extends Error {},
}));

vi.mock("../../../utils/comprovanteGenerator.js", () => ({
  gerarComprovante: vi.fn().mockReturnValue({
    texto: "Comprovante de Ponto\nNSR: 000001\nHASH: a",
    hashVerificacao: "abc123",
  }),
}));

vi.mock("../../../utils/afSignature.js", () => ({
  signContent: vi.fn().mockReturnValue({ hash: "hash123", assinado: false }),
}));

vi.mock("../../../utils/cpfEncryption.js", () => ({
  decryptCpf: vi.fn().mockReturnValue("52998224725"),
  formatCpfDigits: vi.fn().mockReturnValue("52998224725"),
}));

vi.mock("../../../services/relatorioMensalService.js", () => ({
  gerarRelatorioMensal: vi.fn(),
  gerarRelatorioMensalPdf: vi.fn(),
}));

import { CheckinController } from "../../../controller/CheckinController.js";

describe("CheckinController — B3 Escala Seg-Dom → Justificativa", () => {
  let controller: CheckinController;
  let res: any;
  let req: any;
  let txJustificativaCreate: ReturnType<typeof vi.fn>;

  const mockCompany = { cnpj: "11222333000181", name: "Empresa Teste" };
  const baseUser = (workScheduleId: string | null) => ({
    id: "user-1",
    name: "João",
    companyId: "company-1",
    cpf: "encrypted",
    workScheduleId,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    controller = new CheckinController();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
    };
    txJustificativaCreate = vi.fn().mockResolvedValue({});
    // default: no schedule
    mockExtendedPrisma.workSchedule.findUnique.mockResolvedValue(null);
    mockExtendedPrisma.checkIn.count.mockResolvedValue(0);
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
    mockExtendedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        checkIn: {
          create: vi.fn().mockResolvedValue({
            id: "c1",
            nsr: 1,
            ano: 2026,
            type: "ENTRY",
            createdAt: new Date(),
            latitude: -23.55,
            longitude: -46.63,
            employerCnpj: "11222333000181",
          }),
        },
        justificativa: { create: txJustificativaCreate },
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockUserWithSchedule(jornadaTipo: string | null) {
    const user = baseUser(jornadaTipo ? "ws-1" : null);
    mockExtendedPrisma.user.findUnique.mockResolvedValue(user as any);
    if (jornadaTipo) {
      mockExtendedPrisma.workSchedule.findUnique.mockResolvedValue({
        jornadaTipo,
        name: jornadaTipo,
      } as any);
    } else {
      mockExtendedPrisma.workSchedule.findUnique.mockResolvedValue(null as any);
    }
  }

  function setupCompany() {
    mockExtendedPrisma.company.findUnique.mockResolvedValue(mockCompany as any);
  }

  // Helper to set fake Monday so startOfWeek is deterministic
  function useMonday() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T10:00:00")); // Segunda
  }

  it("5x2 — 5 ENTRY na semana Seg-Dom → 5º sem flag", async () => {
    useMonday();
    mockUserWithSchedule("5x2");
    setupCompany();
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]); // tiposHoje vazio
    mockExtendedPrisma.checkIn.count.mockResolvedValue(4); // já tem 4, este será o 5º (4 >=5? false → 4 <5)

    req = { user: { id: "user-1" }, body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 } };
    await controller.createCheckin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(txJustificativaCreate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.not.objectContaining({ foraDaEscala: true }));
  });

  it("5x2 — 6º ENTRY na semana Seg-Dom → foraDaEscala + justificativa", async () => {
    useMonday();
    mockUserWithSchedule("5x2");
    setupCompany();
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
    mockExtendedPrisma.checkIn.count.mockResolvedValue(5); // já tem 5, este será 6º → 5>=5 true

    req = { user: { id: "user-1" }, body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 } };
    await controller.createCheckin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ foraDaEscala: true, escalaMotivo: expect.stringContaining("5x2") }));
    expect(txJustificativaCreate).toHaveBeenCalledTimes(1);
    expect(txJustificativaCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "JUSTIFICATIVA_GERAL", userId: "user-1" }) })
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-Fora-Da-Escala", "true");
  });

  it("6x1 — 6 ENTRY na semana → 6º sem flag", async () => {
    useMonday();
    mockUserWithSchedule("6x1");
    setupCompany();
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
    mockExtendedPrisma.checkIn.count.mockResolvedValue(5); // 5 existentes → este 6º, 5>=6 false

    req = { user: { id: "user-1" }, body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 } };
    await controller.createCheckin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(txJustificativaCreate).not.toHaveBeenCalled();
  });

  it("6x1 — 7º ENTRY na semana → foraDaEscala + justificativa", async () => {
    useMonday();
    mockUserWithSchedule("6x1");
    setupCompany();
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
    mockExtendedPrisma.checkIn.count.mockResolvedValue(6); // 6 existentes → este 7º, 6>=6 true

    req = { user: { id: "user-1" }, body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 } };
    await controller.createCheckin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ foraDaEscala: true, escalaMotivo: expect.stringContaining("6x1") }));
    expect(txJustificativaCreate).toHaveBeenCalledTimes(1);
  });

  it("12x36 — 4 ENTRY na semana → 4º sem flag (limite 4)", async () => {
    useMonday();
    mockUserWithSchedule("12x36");
    setupCompany();
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
    mockExtendedPrisma.checkIn.count.mockResolvedValue(3); // 3 existentes → este 4º, 3>=4 false

    req = { user: { id: "user-1" }, body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 } };
    await controller.createCheckin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(txJustificativaCreate).not.toHaveBeenCalled();
  });

  it("12x36 — 5º ENTRY na semana → foraDaEscala + justificativa (limite 4)", async () => {
    useMonday();
    mockUserWithSchedule("12x36");
    setupCompany();
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
    mockExtendedPrisma.checkIn.count.mockResolvedValue(4); // 4 existentes → este 5º, 4>=4 true

    req = { user: { id: "user-1" }, body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 } };
    await controller.createCheckin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ foraDaEscala: true, escalaMotivo: expect.stringContaining("12x36") }));
    expect(txJustificativaCreate).toHaveBeenCalledTimes(1);
  });

  it("sem escala (workScheduleId null) → nunca gera justificativa de escala", async () => {
    useMonday();
    mockUserWithSchedule(null);
    setupCompany();
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
    // count nem deve ser chamado
    req = { user: { id: "user-1" }, body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 } };
    await controller.createCheckin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockExtendedPrisma.checkIn.count).not.toHaveBeenCalled();
    expect(txJustificativaCreate).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ foraDaEscala: true }));
  });

  it("apenas ENTRY verifica escala — LUNCH_START/EXIT não gera flag mesmo com semana cheia", async () => {
    useMonday();
    mockUserWithSchedule("5x2");
    setupCompany();
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([{ type: "ENTRY" }]); // já tem ENTRY hoje
    mockExtendedPrisma.checkIn.count.mockResolvedValue(5);

    req = { user: { id: "user-1" }, body: { type: "LUNCH_START", latitude: -23.55, longitude: -46.63 } };
    await controller.createCheckin(req, res);

    // deve passar (tem ENTRY), sem flag de escala pois não é ENTRY
    expect(res.status).toHaveBeenCalledWith(201);
    expect(txJustificativaCreate).not.toHaveBeenCalled();
  });
});
