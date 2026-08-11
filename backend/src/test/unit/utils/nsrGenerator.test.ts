import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNextNSR,
  currentYear,
  NsrLimitExceededError,
} from "../../../utils/nsrGenerator.js";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    checkIn: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "../../../database/prisma.js";

describe("nsrGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("currentYear", () => {
    it("deve retornar o ano atual", () => {
      expect(currentYear()).toBe(new Date().getFullYear());
    });
  });

  describe("getNextNSR", () => {
    it("deve retornar 1 para empresa sem registros", async () => {
      (prisma.checkIn.findFirst as any).mockResolvedValue(null);

      const nsr = await getNextNSR("company-1", 2026);

      expect(nsr).toBe(1);
      expect(prisma.checkIn.findFirst).toHaveBeenCalledWith({
        where: { companyId: "company-1", ano: 2026 },
        orderBy: { nsr: "desc" },
        select: { nsr: true },
      });
    });

    it("deve incrementar NSR existente", async () => {
      (prisma.checkIn.findFirst as any).mockResolvedValue({ nsr: 42 });

      const nsr = await getNextNSR("company-1", 2026);

      expect(nsr).toBe(43);
    });

    it("deve incrementar a partir de NSR alto", async () => {
      (prisma.checkIn.findFirst as any).mockResolvedValue({ nsr: 999998 });

      const nsr = await getNextNSR("company-1", 2026);

      expect(nsr).toBe(999999);
    });

    it("deve lançar NsrLimitExceededError ao atingir 999.999", async () => {
      (prisma.checkIn.findFirst as any).mockResolvedValue({ nsr: 999999 });

      await expect(getNextNSR("company-1", 2026)).rejects.toThrow(
        NsrLimitExceededError
      );
    });

    it("deve usar ano corrente quando não especificado", async () => {
      (prisma.checkIn.findFirst as any).mockResolvedValue(null);

      const nsr = await getNextNSR("company-1");

      expect(prisma.checkIn.findFirst).toHaveBeenCalledWith({
        where: { companyId: "company-1", ano: currentYear() },
        orderBy: { nsr: "desc" },
        select: { nsr: true },
      });
      expect(nsr).toBe(1);
    });

    it("deve filtrar por empresa correta", async () => {
      (prisma.checkIn.findFirst as any).mockResolvedValue(null);

      await getNextNSR("company-abc", 2026);

      expect(prisma.checkIn.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: "company-abc" }),
        })
      );
    });

    it("deve filtrar por ano correto", async () => {
      (prisma.checkIn.findFirst as any).mockResolvedValue(null);

      await getNextNSR("company-1", 2027);

      expect(prisma.checkIn.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ano: 2027 }),
        })
      );
    });

    it("deve reiniciar NSR para ano diferente", async () => {
      // Year 2027 has no records yet
      (prisma.checkIn.findFirst as any).mockResolvedValue(null);

      const nsr = await getNextNSR("company-1", 2027);

      expect(nsr).toBe(1);
      expect(prisma.checkIn.findFirst).toHaveBeenCalledWith({
        where: { companyId: "company-1", ano: 2027 },
        orderBy: { nsr: "desc" },
        select: { nsr: true },
      });
    });
  });

  describe("NsrLimitExceededError", () => {
    it("deve ter nome 'NsrLimitExceededError'", () => {
      const error = new NsrLimitExceededError("test");
      expect(error.name).toBe("NsrLimitExceededError");
    });

    it("deve ser instância de Error", () => {
      const error = new NsrLimitExceededError("test");
      expect(error).toBeInstanceOf(Error);
    });

    it("deve conter a mensagem passada", () => {
      const error = new NsrLimitExceededError("custom message");
      expect(error.message).toBe("custom message");
    });
  });
});
