import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: { findMany: vi.fn(), updateMany: vi.fn() },
  checkIn: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  company: { findMany: vi.fn() },
  inviteToken: { deleteMany: vi.fn() },
  auditLog: { create: vi.fn() },
  pageView: { deleteMany: vi.fn(), count: vi.fn() },
  analyticsEvent: { deleteMany: vi.fn() },
}));

vi.mock("../../../database/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../../utils/cpfEncryption.js", () => ({
  decryptCpf: vi.fn().mockReturnValue("52998224725"),
}));

vi.mock("../../../utils/afSignature.js", () => ({
  signContent: vi.fn().mockReturnValue({ hash: "abc", assinado: false, assinatura: null, erro: null }),
}));

import { runRetentionCleanup } from "../../../scripts/retentionCleanup.js";

describe("runRetentionCleanup — métricas 90d", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.checkIn.count.mockResolvedValue(0);
    mockPrisma.company.findMany.mockResolvedValue([]);
    mockPrisma.inviteToken.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.pageView.deleteMany.mockResolvedValue({ count: 5 });
    mockPrisma.analyticsEvent.deleteMany.mockResolvedValue({ count: 12 });
  });

  it("deve deletar PageView e AnalyticsEvent com mais de 90 dias", async () => {
    const result = await runRetentionCleanup();

    expect(mockPrisma.pageView.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdAt: expect.objectContaining({ lt: expect.any(Date) }) }) })
    );
    expect(mockPrisma.analyticsEvent.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdAt: expect.objectContaining({ lt: expect.any(Date) }) }) })
    );
    expect(result.pageViewsDeletados).toBe(5);
    expect(result.analyticsEventsDeletados).toBe(12);
  });

  it("deve tolerar falha ao limpar PageView (não deve quebrar job)", async () => {
    mockPrisma.pageView.deleteMany.mockRejectedValue(new Error("db down"));

    const result = await runRetentionCleanup();

    expect(result.pageViewsDeletados).toBe(0);
    expect(result.analyticsEventsDeletados).toBe(12);
  });

  it("deve usar janela de 90 dias", async () => {
    const now = Date.now();
    await runRetentionCleanup();

    const pvCall = mockPrisma.pageView.deleteMany.mock.calls[0]![0] as { where: { createdAt: { lt: Date } } };
    const diffMs = now - pvCall.where.createdAt.lt.getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(89);
    expect(diffDays).toBeLessThan(91);
  });

  it("não deve vazar IP — PageView deletado sem armazenar IP cru", async () => {
    await runRetentionCleanup();
    // Garante que deleteMany não filtra por IP
    const pvWhere = mockPrisma.pageView.deleteMany.mock.calls[0]![0].where;
    expect(JSON.stringify(pvWhere)).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });
});
