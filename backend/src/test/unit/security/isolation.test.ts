/**
 * Fase 5A — Testes de Isolamento Multi-Tenant / IDOR
 *
 * Garante que empresa A não consegue acessar dados de empresa B,
 * e que usuário A não consegue acessar recursos de usuário B.
 *
 * IMPORTANTE: Todos os vi.mock() devem estar no nível superior (top-level)
 * pois são automaticamente hoisted pelo Vitest.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasFaceDescriptor } from "../../../utils/faceEncryption.js";

// ─── Company/User IDs ─────────────────────────────────────────
const COMPANY_A = "550e8400-e29b-41d4-a716-446655440001";
const COMPANY_B = "550e8400-e29b-41d4-a716-446655440002";
const USER_A = "550e8400-e29b-41d4-a716-446655440010";
const USER_B = "550e8400-e29b-41d4-a716-446655440020";

// ─── Mock factories (vi.hoisted garante acesso nos vi.mock) ────
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
  company: { findUnique: vi.fn(), update: vi.fn() },
  consentimento: { upsert: vi.fn(), findMany: vi.fn() },
  inviteToken: { findFirst: vi.fn(), update: vi.fn() },
  payment: { findMany: vi.fn() },
  subscription: { findFirst: vi.fn() },
}));

const mockExtendedPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  company: { findUnique: vi.fn() },
  checkIn: { findFirst: vi.fn(), findMany: vi.fn() },
  workSchedule: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  justificativa: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  auditLog: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));

// ─── ALL vi.mock() at top level ────────────────────────────────
vi.mock("../../../database/prisma.js", () => ({ prisma: mockPrisma }));
vi.mock("../../../database/prisma-extensions.js", () => ({ extendedPrisma: mockExtendedPrisma }));

vi.mock("../../../utils/environment.js", () => ({
  Env: { JWT_SECRET: "test", FRONTEND_URL: "http://localhost:3000" },
}));
vi.mock("../../../utils/faceEncryption.js", () => ({
  encryptFaceDescriptor: vi.fn().mockReturnValue("enc"),
  hasFaceDescriptor: vi.fn(),
  decryptFaceDescriptor: vi.fn().mockReturnValue(new Float32Array(128)),
}));
vi.mock("../../../utils/cpfEncryption.js", () => ({
  decryptCpf: vi.fn().mockReturnValue("529.982.247-25"),
  formatCpfDigits: vi.fn().mockReturnValue("52998224725"),
  decryptAndFormat: vi.fn().mockReturnValue("529.982.247-25"),
}));
vi.mock("../../../utils/nsrGenerator.js", () => ({
  getNextNSR: vi.fn().mockResolvedValue(1),
  currentYear: vi.fn().mockReturnValue(2026),
  NsrLimitExceededError: class extends Error {},
}));
vi.mock("../../../utils/comprovanteGenerator.js", () => ({
  gerarComprovante: vi.fn().mockReturnValue({ texto: "comp", hashVerificacao: "abc" }),
}));
vi.mock("../../../utils/toleranceCalculator.js", () => ({
  aplicarTolerancia: vi.fn().mockReturnValue({ horarioEfetivo: new Date(), dentroDaTolerancia: true, minutosExcedentes: 0 }),
  minutosParaDate: vi.fn().mockReturnValue(new Date()),
  tipoParaHorarioPrevisto: vi.fn().mockReturnValue(480),
  tipoParaTolerancia: vi.fn().mockReturnValue(5),
  isDiaUtil: vi.fn().mockReturnValue(false),
}));
vi.mock("../../../services/relatorioMensalService.js", () => ({
  gerarRelatorioMensal: vi.fn().mockResolvedValue({ csv: "h\nr", hash: "h", filename: "f.csv" }),
}));
vi.mock("../../../services/asaasService.js", () => ({
  createCustomer: vi.fn().mockResolvedValue({ id: "asaas-1" }),
  createSubscription: vi.fn().mockResolvedValue({ id: "sub-1", invoiceUrl: "url", paymentUrl: "url" }),
  cancelSubscription: vi.fn().mockResolvedValue({}),
  updateSubscription: vi.fn().mockResolvedValue({}),
  validateWebhookToken: vi.fn().mockReturnValue(true),
}));
vi.mock("../../../utils/planLimits.js", () => ({
  getPlanLimits: vi.fn().mockReturnValue({ maxEmployees: 100, api: {} }),
  TRIAL_DAYS: 14,
  PlanTier: { DYNAMIC: "DYNAMIC" },
  CompanyStatus: { TRIAL: "TRIAL", ACTIVE: "ACTIVE", CANCELLED: "CANCELLED" },
}));
vi.mock("../../../utils/pricingCalculator.js", () => ({
  calculateDynamicPrice: vi.fn().mockReturnValue({ total: 54.9, basePrice: 54.9, extraEmployees: 0, extraPricePerUnit: 5, paidEmployees: 5 }),
}));
vi.mock("../../../utils/cpfCnpjValidator.js", () => ({
  validateDocument: vi.fn().mockReturnValue({ valid: true, formatted: "529.982.247-25" }),
}));
vi.mock("../../../utils/formattName.js", () => ({
  FormattName: vi.fn().mockReturnValue("Test User"),
}));
vi.mock("../../../middleware/AuditMiddleware.js", () => ({
  createAuditLog: vi.fn(),
}));

// ─── Helper ───────────────────────────────────────────────────
function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
    setHeader: vi.fn(),
  };
}

// ═══════════════════════════════════════════════════════════════
// SessionController — IDOR CRÍTICO (face descriptor update)
// ═══════════════════════════════════════════════════════════════
describe("Security: SessionController — IDOR face update", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/SessionController.js");
    controller = new mod.SessionController();
    res = makeRes();
  });

  it("deve bloquear User A de atualizar face do User B (empresa diferente)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_B,
      companyId: COMPANY_B,
    });

    const req = {
      user: { id: USER_A, companyId: COMPANY_A },
      params: { userId: USER_B },
      body: { faceDescriptor: [0.1, 0.2, 0.3] },
    };

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("deve permitir User A atualizar a própria face", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_A,
      companyId: COMPANY_A,
    });
    mockPrisma.user.update.mockResolvedValue({});

    const req = {
      user: { id: USER_A, companyId: COMPANY_A },
      params: { userId: USER_A },
      body: { faceDescriptor: [0.1, 0.2, 0.3] },
    };

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("deve retornar 404 quando companyId é null (não autenticado)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = {
      user: { id: USER_A, companyId: null },
      params: { userId: USER_A },
      body: { faceDescriptor: [0.1, 0.2, 0.3] },
    };

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ═══════════════════════════════════════════════════════════════
// CheckinController — Isolamento multi-tenant
// ═══════════════════════════════════════════════════════════════
describe("Security: CheckinController — Isolamento multi-tenant", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/CheckinController.js");
    controller = new mod.CheckinController();
    res = makeRes();
  });

  it("listByCompany: deve retornar 403 quando companyId é null", async () => {
    const req = { user: { id: USER_A, companyId: null }, query: {} };
    await controller.listByCompany(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("listMonthly: deve retornar 403 quando companyId é null", async () => {
    const req = { user: { id: USER_A, companyId: null }, query: { year: "2026", month: "8" } };
    await controller.listMonthly(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("exportRelatorioMensal: deve retornar 403 quando companyId é null", async () => {
    const req = { user: { id: USER_A, companyId: null }, query: { year: "2026", month: "8" } };
    await controller.exportRelatorioMensal(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════════════════════════
// CompanyController — Isolamento multi-tenant
// ═══════════════════════════════════════════════════════════════
describe("Security: CompanyController — Isolamento multi-tenant", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/company/CompanyController.js");
    controller = new mod.CompanyController();
    res = makeRes();
  });

  it("getMe: deve retornar 401 quando companyId é null", async () => {
    const req = { user: { id: USER_A, companyId: null } };
    await controller.getMe(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("getMe: deve retornar dados da empresa autenticada", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: COMPANY_A, name: "Empresa A", cnpj: "11222333000181", plan: "DYNAMIC",
      status: "ACTIVE", planExpiresAt: null, maxEmployees: 100, settings: {},
      trialUsed: true, billingType: null, asaasPaymentMethod: null, createdAt: new Date(),
      _count: { users: 5 },
    });

    const req = { user: { id: USER_A, companyId: COMPANY_A } };
    await controller.getMe(req, res);

    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.id).toBe(COMPANY_A);
  });

  it("revokeInviteToken: deve retornar 404 quando token pertence a outra empresa", async () => {
    mockPrisma.inviteToken.findFirst.mockResolvedValue(null);

    const req = {
      user: { id: USER_A, companyId: COMPANY_A },
      params: { id: "550e8400-e29b-41d4-a716-446655440050" },
    };

    await controller.revokeInviteToken(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.inviteToken.update).not.toHaveBeenCalled();
  });

  it("createInviteToken: deve retornar 403 quando usuário não é admin", async () => {
    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "EMPLOYEE" },
      body: { expiresInDays: 7 },
    };

    await controller.createInviteToken(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════════════════════════
// PaymentController — Isolamento multi-tenant
// ═══════════════════════════════════════════════════════════════
describe("Security: PaymentController — Isolamento multi-tenant", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/payment/PaymentController.js");
    controller = new mod.PaymentController();
    res = makeRes();
  });

  it("getPaymentHistory: deve retornar 401 quando companyId é null", async () => {
    const req = { user: { id: USER_A, companyId: null } };
    await controller.getPaymentHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("getPaymentHistory: deve filtrar por companyId", async () => {
    mockPrisma.payment.findMany.mockResolvedValue([]);

    const req = { user: { id: USER_A, companyId: COMPANY_A } };
    await controller.getPaymentHistory(req, res);

    expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: COMPANY_A }) })
    );
  });

  it("cancelSubscription: deve retornar 404 quando não há assinatura", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    const req = { user: { id: USER_A, companyId: COMPANY_A } };
    await controller.cancelSubscription(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("cancelSubscription: deve retornar 401 quando companyId é null", async () => {
    const req = { user: { id: USER_A, companyId: null } };
    await controller.cancelSubscription(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ═══════════════════════════════════════════════════════════════
// PrivacyController — Isolamento por usuário
// ═══════════════════════════════════════════════════════════════
describe("Security: PrivacyController — Isolamento por usuário", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    (hasFaceDescriptor as any).mockReturnValue(true);
    const mod = await import("../../../controller/PrivacyController.js");
    controller = new mod.PrivacyController();
    res = makeRes();
  });

  it("getMyData: deve retornar 403 quando companyId é null", async () => {
    const req = { user: { id: USER_A, companyId: null } };
    await controller.getMyData(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("getMyData: deve usar req.user.id para buscar dados", async () => {
    mockExtendedPrisma.user.findUnique.mockResolvedValue({
      id: USER_A, name: "User A", email: "a@test.com", cpf: "enc",
      role: "WORKER", createdAt: new Date(), lastLoginAt: null, faceDescriptor: "enc",
    });
    mockExtendedPrisma.checkIn.findMany.mockResolvedValue([]);
    mockPrisma.consentimento.findMany.mockResolvedValue([]);

    const req = { user: { id: USER_A, companyId: COMPANY_A } };
    await controller.getMyData(req, res);

    expect(mockExtendedPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_A } })
    );
  });

  it("deleteMyFace: deve retornar 400 quando face não existe", async () => {
    (hasFaceDescriptor as any).mockReturnValue(false);
    mockExtendedPrisma.user.findUnique.mockResolvedValue({ faceDescriptor: null });

    const req = { user: { id: USER_A, companyId: COMPANY_A }, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } };
    await controller.deleteMyFace(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getMyLogs: deve retornar 403 quando companyId é null", async () => {
    const req = { user: { id: USER_A, companyId: null } };
    await controller.getMyLogs(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════════════════════════
// ConsentController — Isolamento por usuário
// ═══════════════════════════════════════════════════════════════
describe("Security: ConsentController — Isolamento por usuário", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/ConsentController.js");
    controller = new mod.ConsentController();
    res = makeRes();
  });

  it("list: deve retornar consentimentos apenas do usuário autenticado", async () => {
    mockPrisma.consentimento.findMany.mockResolvedValue([
      { tipo: "TERMOS_DE_USO", versao: "1.0", aceite: true, createdAt: new Date() },
    ]);

    const req = { user: { id: USER_A } };
    await controller.list(req, res);

    expect(mockPrisma.consentimento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_A } })
    );
  });

  it("create: deve usar req.user.id para criar consentimento", async () => {
    mockPrisma.consentimento.upsert.mockResolvedValue({});

    const req = {
      user: { id: USER_A },
      body: { tipo: "TERMOS_DE_USO", versao: "1.0", aceite: true },
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    };

    await controller.create(req, res);

    expect(mockPrisma.consentimento.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId_tipo_versao: expect.objectContaining({ userId: USER_A }),
        }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// JustificativaController — Isolamento cross-empresa
// ═══════════════════════════════════════════════════════════════
describe("Security: JustificativaController — Isolamento cross-empresa", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/JustificativaController.js");
    controller = new mod.JustificativaController();
    res = makeRes();
  });

  it("approve: admin da empresa A não deve aprovar justificativa da empresa B", async () => {
    mockExtendedPrisma.justificativa.findFirst.mockResolvedValue(null);

    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "ENTERPRISE_ADMIN" },
      params: { id: "550e8400-e29b-41d4-a716-446655440050" },
      body: { aprovado: true },
    };

    await controller.approve(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockExtendedPrisma.justificativa.update).not.toHaveBeenCalled();
  });

  it("approve: deve retornar 403 quando usuário não é admin", async () => {
    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "EMPLOYEE" },
      params: { id: "550e8400-e29b-41d4-a716-446655440050" },
      body: { aprovado: true },
    };

    await controller.approve(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("approve: deve retornar 403 quando companyId é null", async () => {
    const req = {
      user: { id: USER_A, companyId: null, role: "ENTERPRISE_ADMIN" },
      params: { id: "550e8400-e29b-41d4-a716-446655440050" },
      body: { aprovado: true },
    };

    await controller.approve(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("create: deve retornar 404 quando checkinId não pertence ao usuário", async () => {
    mockExtendedPrisma.checkIn.findFirst.mockResolvedValue(null);

    const req = {
      user: { id: USER_A, companyId: COMPANY_A },
      body: {
        tipo: "FALTA",
        descricao: "Descrição de teste com mais de 10 caracteres",
        dataInicio: "2026-08-10",
        checkinId: "550e8400-e29b-41d4-a716-446655440050",
      },
    };

    await controller.create(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ═══════════════════════════════════════════════════════════════
// WorkScheduleController — Isolamento cross-empresa e auth
// ═══════════════════════════════════════════════════════════════
describe("Security: WorkScheduleController — Isolamento cross-empresa", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/WorkScheduleController.js");
    controller = new mod.WorkScheduleController();
    res = makeRes();
  });

  it("update: deve retornar 404 quando escala pertence a outra empresa", async () => {
    mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue(null);

    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "ENTERPRISE_ADMIN" },
      params: { id: "550e8400-e29b-41d4-a716-446655440050" },
      body: { name: "Nova Escala" },
    };

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockExtendedPrisma.workSchedule.update).not.toHaveBeenCalled();
  });

  it("remove: deve retornar 404 quando escala pertence a outra empresa", async () => {
    mockExtendedPrisma.workSchedule.findFirst.mockResolvedValue(null);

    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "ENTERPRISE_ADMIN" },
      params: { id: "550e8400-e29b-41d4-a716-446655440050" },
    };

    await controller.remove(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("assignToEmployee: deve retornar 404 quando funcionário pertence a outra empresa", async () => {
    mockExtendedPrisma.user.findFirst.mockResolvedValue(null);

    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "ENTERPRISE_ADMIN" },
      body: {
        employeeId: "550e8400-e29b-41d4-a716-446655440050",
        workScheduleId: "550e8400-e29b-41d4-a716-446655440051",
      },
    };

    await controller.assignToEmployee(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("create: deve retornar 403 quando usuário não é admin", async () => {
    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "EMPLOYEE" },
      body: { name: "Escala", entryTime: 480, lunchStart: 720, lunchEnd: 780, exitTime: 1080 },
    };

    await controller.create(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("update: deve retornar 403 quando usuário não é admin", async () => {
    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "EMPLOYEE" },
      params: { id: "550e8400-e29b-41d4-a716-446655440050" },
      body: { name: "Escala" },
    };

    await controller.update(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("remove: deve retornar 403 quando usuário não é admin", async () => {
    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "EMPLOYEE" },
      params: { id: "550e8400-e29b-41d4-a716-446655440050" },
    };

    await controller.remove(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("assignToEmployee: deve retornar 403 quando usuário não é admin", async () => {
    const req = {
      user: { id: USER_A, companyId: COMPANY_A, role: "EMPLOYEE" },
      body: {
        employeeId: "550e8400-e29b-41d4-a716-446655440050",
        workScheduleId: "550e8400-e29b-41d4-a716-446655440051",
      },
    };

    await controller.assignToEmployee(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════════════════════════
// AfdController — Isolamento multi-tenant
// ═══════════════════════════════════════════════════════════════
describe("Security: AfdController — Isolamento multi-tenant", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/AfdController.js");
    controller = new mod.AfdController();
    res = makeRes();
  });

  it("exportAfd: deve retornar 403 quando companyId é null", async () => {
    const req = {
      user: { id: USER_A, companyId: null },
      query: { startDate: "2026-08-01", endDate: "2026-08-10" },
    };

    await controller.exportAfd(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("exportAfd: deve retornar 404 quando empresa não encontrada", async () => {
    mockExtendedPrisma.company.findUnique.mockResolvedValue(null);

    const req = {
      user: { id: USER_A, companyId: COMPANY_A },
      query: { startDate: "2026-08-01", endDate: "2026-08-10" },
    };

    await controller.exportAfd(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ═══════════════════════════════════════════════════════════════
// MasterController — Acesso restrito
// ═══════════════════════════════════════════════════════════════
describe("Security: MasterController — Acesso restrito", () => {
  let controller: any;
  let res: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../controller/master/MasterController.js");
    controller = new mod.MasterController();
    res = makeRes();
  });

  it("impersonate: deve retornar 400 quando empresa está cancelada", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: COMPANY_A, name: "Empresa A", plan: "DYNAMIC", status: "CANCELLED",
    });

    const req = {
      user: { id: "550e8400-e29b-41d4-a716-446655440099", role: "MASTER" },
      params: { id: COMPANY_A },
    };

    await controller.impersonate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("impersonate: deve retornar 404 quando empresa não encontrada", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);

    const req = {
      user: { id: "550e8400-e29b-41d4-a716-446655440099", role: "MASTER" },
      params: { id: "550e8400-e29b-41d4-a716-446655440099" },
    };

    await controller.impersonate(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
