import { vi } from "vitest";

type MockFunction = ReturnType<typeof vi.fn>;

interface MockModel {
  findUnique: MockFunction;
  findFirst: MockFunction;
  findMany: MockFunction;
  create: MockFunction;
  createMany: MockFunction;
  update: MockFunction;
  updateMany: MockFunction;
  upsert: MockFunction;
  delete: MockFunction;
  deleteMany: MockFunction;
  count: MockFunction;
  aggregate: MockFunction;
  groupBy: MockFunction;
}

function createMockModel(): MockModel {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

function createMockPrisma() {
  const models = {
    company: createMockModel(),
    user: createMockModel(),
    checkIn: createMockModel(),
    subscription: createMockModel(),
    payment: createMockModel(),
    inviteToken: createMockModel(),
    inviteTokenUsage: createMockModel(),
    auditLog: createMockModel(),
    workSchedule: createMockModel(),
    consentimento: createMockModel(),
    justificativa: createMockModel(),
  };

  const prisma = {
    ...models,
    $transaction: vi.fn((fn: unknown) => {
      if (typeof fn === "function") {
        return fn(prisma);
      }
      return fn;
    }),
    $extends: vi.fn().mockReturnThis(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  return prisma;
}

export const prismaMock = createMockPrisma();

export function resetPrismaMock() {
  for (const model of Object.values(prismaMock)) {
    if (typeof model === "object" && model !== null && "findUnique" in model) {
      const m = model as MockModel;
      m.findUnique.mockReset();
      m.findFirst.mockReset();
      m.findMany.mockReset();
      m.create.mockReset();
      m.createMany.mockReset();
      m.update.mockReset();
      m.updateMany.mockReset();
      m.upsert.mockReset();
      m.delete.mockReset();
      m.deleteMany.mockReset();
      m.count.mockReset();
      m.aggregate.mockReset();
      m.groupBy.mockReset();
    }
  }
  prismaMock.$transaction.mockReset();
  prismaMock.$extends.mockReset();
}
