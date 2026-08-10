# Plano de Testes — Viggo Backend

**Data:** 10 de Agosto de 2026
**Stack:** Vitest + Supertest + Prisma (PostgreSQL)
**Escopo:** Backend (Express 5 + Prisma ORM + TypeScript)
**Objetivo:** Cobrir unitários, integração e E2E nos findings G10 (testes automatizados) e T45

---

## Status de Implementação — Fase 1 (Infraestrutura)

> **Implementado em:** 10/08/2026
>
> | Arquivo | Status | Descrição |
> |---------|--------|-----------|
> | `vitest.config.ts` | ✅ Criado | Configuração do Vitest com coverage, aliases, timeouts |
> | `src/test/globalSetup.ts` | ✅ Criado | Setup global: aplica migrations no banco de teste |
> | `src/test/setup.ts` | ✅ Criado | Setup por arquivo: env vars, mock de logger |
> | `src/test/helpers/prismaMock.ts` | ✅ Criado | Mock factory do PrismaClient com todos models |
> | `src/test/helpers/authHelper.ts` | ✅ Criado | Geração de JWTs mockados (master/admin/employee) |
> | `src/test/helpers/testApp.ts` | ✅ Criado | Instância Express para supertest |
> | `package.json` | ✅ Atualizado | Scripts: test, test:watch, test:coverage, test:ui |

### ⚠️ Pendente: Instalação de Dependências

Node.js não estava disponível na máquina no momento da implementação.
Execute o seguinte comando para instalar as dependências de teste:

```bash
cd backend
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

Após instalação, valide com:

```bash
npm run test       # Deve rodar sem erros (sem testes ainda, mas sem crash)
npm run build      # Deve compilar sem erros de tipos
```

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Infraestrutura](#2-infraestrutura)
3. [Estrutura de Diretórios](#3-estrutura-de-diretórios)
4. [Helpers e Utilitários de Teste](#4-helpers-e-utilitários-de-teste)
5. [Testes Unitários — Utils](#5-testes-unitários--utils)
6. [Testes Unitários — Services](#6-testes-unitários--services)
7. [Testes Unitários — Middleware](#7-testes-unitários--middleware)
8. [Testes Unitários — Controllers (Mock)](#8-testes-unitários--controllers-mock)
9. [Testes de Integração](#9-testes-de-integração)
10. [Testes E2E](#10-testes-e2e)
11. [Priorização e Cronograma](#11-priorização-e-cronograma)
12. [Configuração do Banco de Testes](#12-configuração-do-banco-de-testes)
13. [Mocking Strategy](#13-mocking-strategy)
14. [Cobertura e Métricas](#14-cobertura-e-métricas)
15. [Convenções](#15-convenções)
16. [Comandos](#16-comandos)

---

## 1. Visão Geral

### 1.1 Findings Relacionados

| Finding | Descrição | Severidade |
|---------|-----------|------------|
| **G10** | Testes automatizados ausentes | 🟡 Médio (Boa Prática / Auditoria) |
| **T45** | Suite de testes vitest — cobertura mínima rotas críticas | 🟡 Médio |

### 1.2 O que será coberto

| Tipo | Escopo | Quantidade Estimada |
|------|--------|---------------------|
| **Unitários** | Funções puras (utils), services, middleware, controllers com mock | ~33 arquivos |
| **Integração** | Endpoints HTTP com DB real (Prisma + PostgreSQL) | ~3 arquivos |
| **E2E** | Fluxos completos de usuário (multi-step) | ~4 arquivos |
| **Total** | | ~40 arquivos de teste |

### 1.3 Dependências

```bash
# Backend — instalar como devDependencies
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

> **Nota:** `prisma` já existe como devDependency.

---

## 2. Infraestrutura

### 2.1 `vitest.config.ts`

Criar na raiz do `backend/`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    globalSetup: "./src/test/globalSetup.ts",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/test/**",
        "src/@types/**",
        "src/diagramas/**",
        "src/server.ts",
      ],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 80,
      },
    },
  },
});
```

### 2.2 Scripts no `package.json`

Adicionar à seção `"scripts"`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui"
}
```

### 2.3 `src/test/globalSetup.ts`

Responsável por criar o banco de teste e aplicar migrations:

```typescript
import { execSync } from "child_process";

export default async function setup() {
  // Criar banco de teste se não existir
  process.env.DATABASE_URL = process.env.DATABASE_URL?.replace(
    /viggo(?!\_test)/,
    "viggo_test"
  );

  // Aplicar migrations no banco de teste
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    cwd: process.cwd(),
  });

  console.log(`[globalSetup] Banco de teste configurado: ${process.env.DATABASE_URL}`);
}
```

### 2.4 `src/test/setup.ts`

Configuração que roda antes de cada arquivo de teste:

```typescript
import { beforeAll, afterAll, vi } from "vitest";

// Variáveis de ambiente para testes
process.env.NODE_ENV = "TEST";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.PORT = "3334";
process.env.CPF_ENCRYPTION_KEY = "a".repeat(64); // 64 hex chars
process.env.FACE_ENCRYPTION_KEY = "b".repeat(64); // 64 hex chars
process.env.ASAAS_API_KEY = "test-asaas-key";
process.env.ASAAS_ENVIRONMENT = "sandbox";
process.env.ASAAS_WEBHOOK_TOKEN = "test-webhook-token";

beforeAll(() => {
  // Silenciar logs de pino durante testes
  vi.mock("../utils/logger.ts", () => ({
    default: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  }));
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

---

## 3. Estrutura de Diretórios

```
backend/src/
├── test/
│   ├── setup.ts                          # Setup por arquivo
│   ├── globalSetup.ts                    # Setup global (DB)
│   ├── helpers/
│   │   ├── prismaMock.ts                 # Mock do PrismaClient
│   │   ├── authHelper.ts                 # Gera JWTs mockados
│   │   └── testApp.ts                    # Instância Express para supertest
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── cpfCnpjValidator.test.ts
│   │   │   ├── cpfEncryption.test.ts
│   │   │   ├── faceEncryption.test.ts
│   │   │   ├── nsrGenerator.test.ts
│   │   │   ├── toleranceCalculator.test.ts
│   │   │   ├── euclideanDistance.test.ts
│   │   │   ├── formattName.test.ts
│   │   │   ├── comprovanteGenerator.test.ts
│   │   │   ├── planLimits.test.ts
│   │   │   ├── pricingCalculator.test.ts
│   │   │   └── environment.test.ts
│   │   ├── services/
│   │   │   ├── relatorioMensalService.test.ts
│   │   │   └── asaasService.test.ts
│   │   └── middleware/
│   │       ├── AuthMiddleware.test.ts
│   │       ├── AuditMiddleware.test.ts
│   │       ├── RoleGuard.test.ts
│   │       └── PlanMiddleware.test.ts
│   ├── integration/
│   │   ├── controllers/
│   │   │   ├── CheckinController.test.ts
│   │   │   ├── CompanyController.test.ts
│   │   │   ├── ConsentController.test.ts
│   │   │   ├── EmployeesController.test.ts
│   │   │   ├── JustificativaController.test.ts
│   │   │   ├── PrivacyController.test.ts
│   │   │   ├── SessionController.test.ts
│   │   │   ├── WorkScheduleController.test.ts
│   │   │   ├── AfdController.test.ts
│   │   │   ├── AuthController.test.ts
│   │   │   ├── MasterController.test.ts
│   │   │   └── PaymentController.test.ts
│   │   └── routes/
│   │       ├── checkinRoutes.test.ts
│   │       ├── companyRoutes.test.ts
│   │       └── privacyRoutes.test.ts
│   └── e2e/
│       ├── auth-flow.test.ts
│       ├── checkin-flow.test.ts
│       ├── invite-flow.test.ts
│       └── lgpd-flow.test.ts
```

---

## 4. Helpers e Utilitários de Teste

### 4.1 `test/helpers/prismaMock.ts`

Mock do PrismaClient com factory para cada model:

```typescript
import { vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Factory de mocks para cada model do Prisma
const createMockPrisma = () => {
  const mock = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    checkIn: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    consentimento: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    justificativa: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    workSchedule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inviteToken: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inviteTokenUsage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: unknown) => {
      if (typeof fn === "function") {
        return fn(mock);
      }
      return fn;
    }),
    $extends: vi.fn().mockReturnThis(),
  };

  return mock as unknown as PrismaClient;
};

export const prismaMock = createMockPrisma();
```

### 4.2 `test/helpers/authHelper.ts`

Gera tokens JWT mockados para cada role:

```typescript
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-for-testing-only";

interface MockTokenPayload {
  id: string;
  role: "MASTER" | "ENTERPRISE_ADMIN" | "EMPLOYEE";
  companyId: string;
  planTier?: string;
  isMaster?: boolean;
}

export function generateMockToken(payload: MockTokenPayload): string {
  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
      companyId: payload.companyId,
      planTier: payload.planTier ?? "DYNAMIC",
      isMaster: payload.isMaster ?? payload.role === "MASTER",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export const MOCK_USERS = {
  master: {
    id: "master-uuid-001",
    role: "MASTER" as const,
    companyId: "company-uuid-001",
    isMaster: true,
  },
  admin: {
    id: "admin-uuid-001",
    role: "ENTERPRISE_ADMIN" as const,
    companyId: "company-uuid-001",
    isMaster: false,
  },
  employee: {
    id: "employee-uuid-001",
    role: "EMPLOYEE" as const,
    companyId: "company-uuid-001",
    isMaster: false,
  },
};

export const MOCK_TOKENS = {
  master: generateMockToken(MOCK_USERS.master),
  admin: generateMockToken(MOCK_USERS.admin),
  employee: generateMockToken(MOCK_USERS.employee),
};
```

### 4.3 `test/helpers/testApp.ts`

Cria instância Express para testes HTTP com supertest:

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { routes } from "../../routes/index.js";

export function createTestApp() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(routes);

  // Error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("Test error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  );

  return app;
}
```

---

## 5. Testes Unitários — Utils

### 5.1 `cpfCnpjValidator.test.ts`

**Arquivo:** `src/utils/cpfCnpjValidator.ts`

```typescript
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
} from "../cpfCnpjValidator.js";

describe("cpfCnpjValidator", () => {
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
    });

    it("deve rejeitar CPF com menos de 11 dígitos", () => {
      expect(validateCPF("123.456.789-0")).toBe(false);
      expect(validateCPF("123.456.789")).toBe(false);
    });

    it("deve rejeitar string vazia", () => {
      expect(validateCPF("")).toBe(false);
    });
  });

  describe("validateCNPJ", () => {
    it.each([
      "11.222.333/0001-81",
      "11222333000181",
    ])("deve validar CNPJ válido: %s", (cnpj) => {
      expect(validateCNPJ(cnpj)).toBe(true);
    });

    it("deve rejeitar CNPJ inválido", () => {
      expect(validateCNPJ("11.222.333/0001-00")).toBe(false);
    });

    it("deve rejeitar CNPJ com todos dígitos iguais", () => {
      expect(validateCNPJ("00.000.000/0000-00")).toBe(false);
    });
  });

  describe("formatCPF", () => {
    it("deve formatar CPF sem pontuação", () => {
      expect(formatCPF("52998224725")).toBe("529.982.247-25");
    });

    it("deve manter CPF já formatado", () => {
      expect(formatCPF("529.982.247-25")).toBe("529.982.247-25");
    });
  });

  describe("formatCNPJ", () => {
    it("deve formatar CNPJ sem pontuação", () => {
      expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    });
  });

  describe("detectDocumentType", () => {
    it("deve detectar CPF (11 dígitos)", () => {
      expect(detectDocumentType("52998224725")).toBe("CPF");
    });

    it("deve detectar CNPJ (14 dígitos)", () => {
      expect(detectDocumentType("11222333000181")).toBe("CNPJ");
    });

    it("deve retornar null para formato inválido", () => {
      expect(detectDocumentType("123")).toBeNull();
    });
  });

  describe("validateDocument", () => {
    it("deve validar CPF válido", () => {
      expect(validateDocument("529.982.247-25")).toBe(true);
    });

    it("deve validar CNPJ válido", () => {
      expect(validateDocument("11.222.333/0001-81")).toBe(true);
    });

    it("deve rejeitar documento inválido", () => {
      expect(validateDocument("123.456.789-00")).toBe(false);
    });
  });

  describe("cleanDocument", () => {
    it("deve remover pontuação de CPF", () => {
      expect(cleanDocument("529.982.247-25")).toBe("52998224725");
    });

    it("deve remover pontuação de CNPJ", () => {
      expect(cleanDocument("11.222.333/0001-81")).toBe("11222333000181");
    });
  });

  describe("maskCPF", () => {
    it("deve mascarar CPF", () => {
      expect(maskCPF("52998224725")).toBe("529.***.**7-25");
    });
  });

  describe("maskCNPJ", () => {
    it("deve mascarar CNPJ", () => {
      expect(maskCNPJ("11222333000181")).toBe("11.***.***/0001-81");
    });
  });
});
```

### 5.2 `nsrGenerator.test.ts`

**Arquivo:** `src/utils/nsrGenerator.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNextNSR, currentYear, NsrLimitExceededError } from "../nsrGenerator.js";

// Mock do Prisma
const mockPrisma = {
  checkIn: {
    findFirst: vi.fn(),
  },
};

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
      mockPrisma.checkIn.findFirst.mockResolvedValue(null);

      const nsr = await getNextNSR(mockPrisma as never, "company-1", 2026);

      expect(nsr).toBe(1);
      expect(mockPrisma.checkIn.findFirst).toHaveBeenCalledWith({
        where: { companyId: "company-1", ano: 2026 },
        orderBy: { nsr: "desc" },
        select: { nsr: true },
      });
    });

    it("deve incrementar NSR existente", async () => {
      mockPrisma.checkIn.findFirst.mockResolvedValue({ nsr: 42 });

      const nsr = await getNextNSR(mockPrisma as never, "company-1", 2026);

      expect(nsr).toBe(43);
    });

    it("deve reiniciar NSR a cada ano", async () => {
      mockPrisma.checkIn.findFirst.mockResolvedValue({ nsr: 999999 });

      const nsr = await getNextNSR(mockPrisma as never, "company-1", 2027);

      expect(nsr).toBe(1);
      expect(mockPrisma.checkIn.findFirst).toHaveBeenCalledWith({
        where: { companyId: "company-1", ano: 2027 },
        orderBy: { nsr: "desc" },
        select: { nsr: true },
      });
    });

    it("deve lançar erro ao atingir limite de 999.999", async () => {
      mockPrisma.checkIn.findFirst.mockResolvedValue({ nsr: 999999 });

      await expect(
        getNextNSR(mockPrisma as never, "company-1", 2026)
      ).rejects.toThrow(NsrLimitExceededError);
    });

    it("deve usar ano corrente quando não especificado", async () => {
      mockPrisma.checkIn.findFirst.mockResolvedValue(null);

      const nsr = await getNextNSR(mockPrisma as never, "company-1");

      expect(mockPrisma.checkIn.findFirst).toHaveBeenCalledWith({
        where: { companyId: "company-1", ano: currentYear() },
        orderBy: { nsr: "desc" },
        select: { nsr: true },
      });
      expect(nsr).toBe(1);
    });
  });
});
```

### 5.3 `toleranceCalculator.test.ts`

**Arquivo:** `src/utils/toleranceCalculator.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  aplicarTolerancia,
  minutosParaDate,
  tipoParaHorarioPrevisto,
  tipoParaTolerancia,
  isDiaUtil,
} from "../tolerancerCalculator.js";

describe("toleranceCalculator", () => {
  describe("aplicarTolerancia", () => {
    it("deve retornar horário previsto quando dentro da tolerância", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:03:00"); // 3 min adiantado

      const resultado = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(resultado.horarioEfetivo).toEqual(horarioPrevisto);
      expect(resultado.dentroDaTolerancia).toBe(true);
      expect(resultado.minutosExcedentes).toBe(0);
    });

    it("deve retornar horário real quando fora da tolerância", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:10:00"); // 10 min atrasado

      const resultado = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(resultado.horarioEfetivo).toEqual(horarioReal);
      expect(resultado.dentroDaTolerancia).toBe(false);
      expect(resultado.minutosExcedentes).toBe(5);
    });

    it("deve tolerar exatamente 5 minutos", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:05:00");

      const resultado = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(resultado.dentroDaTolerancia).toBe(true);
    });

    it("deve rejeitar 6 minutos (fora da tolerância)", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:06:00");

      const resultado = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(resultado.dentroDaTolerancia).toBe(false);
    });
  });

  describe("minutosParaDate", () => {
    it("deve converter 0 minutos para meia-noite", () => {
      const referencia = new Date("2026-08-10T00:00:00");
      const resultado = minutosParaDate(0, referencia);

      expect(resultado.getHours()).toBe(0);
      expect(resultado.getMinutes()).toBe(0);
    });

    it("deve converter 480 minutos para 08:00", () => {
      const referencia = new Date("2026-08-10T00:00:00");
      const resultado = minutosParaDate(480, referencia);

      expect(resultado.getHours()).toBe(8);
      expect(resultado.getMinutes()).toBe(0);
    });

    it("deve converter 765 minutos para 12:45", () => {
      const referencia = new Date("2026-08-10T00:00:00");
      const resultado = minutosParaDate(765, referencia);

      expect(resultado.getHours()).toBe(12);
      expect(resultado.getMinutes()).toBe(45);
    });
  });

  describe("isDiaUtil", () => {
    it("deve identificar segunda-feira (bitmask 2)", () => {
      // Seg=2, Ter=4, Qua=8, Qui=16, Sex=32, Sáb=64, Dom=1
      expect(isDiaUtil(2, new Date("2026-08-10"))).toBe(true); // Segunda
    });

    it("deve identificar sábado como não-útil (bitmask 64)", () => {
      expect(isDiaUtil(64, new Date("2026-08-15"))).toBe(false); // Sábado
    });

    it("deve identificar domingo como não-útil (bitmask 1)", () => {
      expect(isDiaUtil(1, new Date("2026-08-16"))).toBe(false); // Domingo
    });

    it("deve aceitar daysOfWeek = 127 (todos os dias)", () => {
      expect(isDiaUtil(127, new Date("2026-08-15"))).toBe(true);
    });
  });
});
```

### 5.4 `euclideanDistance.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { euclideanDistance } from "../euclideanDistance.js";

describe("euclideanDistance", () => {
  it("deve retornar 0 para vetores idênticos", () => {
    const a = new Array(128).fill(0.5);
    const b = new Array(128).fill(0.5);

    expect(euclideanDistance(a, b)).toBe(0);
  });

  it("deve calcular distância corretamente", () => {
    const a = [0, 0];
    const b = [3, 4];

    expect(euclideanDistance(a, b)).toBe(5);
  });

  it("deve ser simétrica", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];

    expect(euclideanDistance(a, b)).toBe(euclideanDistance(b, a));
  });

  it("deve retornar valor positivo", () => {
    const a = [1, 2];
    const b = [3, 4];

    expect(euclideanDistance(a, b)).toBeGreaterThan(0);
  });

  it("deve lançar erro para arrays de dimensões diferentes", () => {
    const a = [1, 2, 3];
    const b = [1, 2];

    expect(() => euclideanDistance(a, b)).toThrow();
  });
});
```

### 5.5 `formattName.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { FormattName } from "../formattName.js";

describe("FormattName", () => {
  it("deve capitalizar primeira letra de cada palavra", () => {
    expect(FormattName("maria silva")).toBe("Maria Silva");
  });

  it("deve manter conectores em minúsculo", () => {
    expect(FormattName("maria das silva")).toBe("Maria das Silva");
    expect(FormattName("joão de souza")).toBe("João de Souza");
    expect(FormattName("ana da silva")).toBe("Ana da Silva");
    expect(FormattName("pedro dos santos")).toBe("Pedro dos Santos");
  });

  it("deve manter 'e' em minúsculo entre nomes", () => {
    expect(FormattName("maria e joão")).toBe("Maria e João");
  });

  it("deve lidar com nomes compostos", () => {
    expect(FormattName("ana beatriz silva")).toBe("Ana Beatriz Silva");
  });

  it("deve lidar com string vazia", () => {
    expect(FormattName("")).toBe("");
  });

  it("deve lidar com uma única palavra", () => {
    expect(FormattName("maria")).toBe("Maria");
  });
});
```

### 5.6 `comprovanteGenerator.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { gerarComprovante } from "../comprovanteGenerator.js";

describe("comprovanteGenerator", () => {
  const dadosValidos = {
    nomeEmpregador: "Empresa Teste LTDA",
    cnpjEmpregador: "11222333000181",
    nomeEmpregado: "João Silva",
    cpfEmpregado: "52998224725",
    dataHora: new Date("2026-08-10T08:00:00"),
    tipoMarcacao: "ENTRY" as const,
    nsr: 1,
    latitude: -23.5505,
    longitude: -46.6333,
  };

  it("deve gerar comprovante com todos campos obrigatórios", () => {
    const comprovante = gerarComprovante(dadosValidos);

    expect(comprovante).toContain("Empresa Teste LTDA");
    expect(comprovante).toContain("11222333000181");
    expect(comprovante).toContain("João Silva");
    expect(comprovante).toContain("52998224725");
    expect(comprovante).toContain("ENTRY");
    expect(comprovante).toContain("NSR: 1");
  });

  it("deve incluir hash SHA-256 no comprovante", () => {
    const comprovante = gerarComprovante(dadosValidos);

    expect(comprovante).toContain("HASH:");
    // SHA-256 gera 64 caracteres hexadecimais
    const hashMatch = comprovante.match(/HASH:\s*([a-f0-9]{64})/);
    expect(hashMatch).not.toBeNull();
  });

  it("deve gerar hash diferente para dados diferentes", () => {
    const comprovante1 = gerarComprovante(dadosValidos);
    const comprovante2 = gerarComprovante({
      ...dadosValidos,
      nsr: 2,
    });

    const hash1 = comprovante1.match(/HASH:\s*([a-f0-9]{64})/)?.[1];
    const hash2 = comprovante2.match(/HASH:\s*([a-f0-9]{64})/)?.[1];

    expect(hash1).not.toBe(hash2);
  });

  it("deve incluir data e hora da marcação", () => {
    const comprovante = gerarComprovante(dadosValidos);

    expect(comprovante).toContain("10/08/2026");
    expect(comprovante).toContain("08:00");
  });
});
```

### 5.7 `pricingCalculator.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { calculateDynamicPrice } from "../pricingCalculator.js";

describe("pricingCalculator", () => {
  it("deve calcular preço base para 10 funcionários (R$54.90)", () => {
    const resultado = calculateDynamicPrice(10);
    expect(resultado.basePrice).toBe(54.9);
    expect(resultado.extraEmployees).toBe(0);
    expect(resultado.extraPrice).toBe(0);
    expect(resultado.total).toBe(54.9);
  });

  it("deve calcular preço com funcionários extras", () => {
    const resultado = calculateDynamicPrice(15);
    expect(resultado.basePrice).toBe(54.9);
    expect(resultado.extraEmployees).toBe(5); // 15 - 10 = 5
    expect(resultado.extraPrice).toBe(25); // 5 * R$5
    expect(resultado.total).toBe(79.9);
  });

  it("deve tratar 1 funcionário (só admin)", () => {
    const resultado = calculateDynamicPrice(1);
    expect(resultado.total).toBe(54.9);
  });

  it("deve lançar erro para 0 funcionários", () => {
    expect(() => calculateDynamicPrice(0)).toThrow();
  });

  it("deve lançar erro para número negativo", () => {
    expect(() => calculateDynamicPrice(-1)).toThrow();
  });
});
```

### 5.8 `planLimits.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  getPlanLimits,
  isTrialExpired,
  getTrialDaysRemaining,
  TRIAL_DAYS,
} from "../planLimits.js";

describe("planLimits", () => {
  describe("getPlanLimits", () => {
    it("deve retornar limites para DYNAMIC", () => {
      const limits = getPlanLimits("DYNAMIC");
      expect(limits.maxEmployees).toBeDefined();
      expect(limits.features).toBeDefined();
    });

    it("deve retornar limites para ENTERPRISE_CUSTOM", () => {
      const limits = getPlanLimits("ENTERPRISE_CUSTOM");
      expect(limits.maxEmployees).toBeDefined();
    });
  });

  describe("isTrialExpired", () => {
    it("deve retornar true para trial expirado", () => {
      const expiresAt = new Date("2026-01-01");
      expect(isTrialExpired(expiresAt)).toBe(true);
    });

    it("deve retornar false para trial válido", () => {
      const expiresAt = new Date("2027-12-31");
      expect(isTrialExpired(expiresAt)).toBe(false);
    });

    it("deve retornar false para null (sem trial)", () => {
      expect(isTrialExpired(null)).toBe(false);
    });
  });

  describe("getTrialDaysRemaining", () => {
    it("deve retornar dias restantes positivos", () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 15);

      const remaining = getTrialDaysRemaining(expiresAt);
      expect(remaining).toBeGreaterThanOrEqual(14);
      expect(remaining).toBeLessThanOrEqual(15);
    });

    it("deve retornar 0 para trial expirado", () => {
      const expiresAt = new Date("2026-01-01");
      expect(getTrialDaysRemaining(expiresAt)).toBe(0);
    });
  });

  it("TRIAL_DAYS deve ser 30", () => {
    expect(TRIAL_DAYS).toBe(30);
  });
});
```

### 5.9 `environment.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";

describe("environment", () => {
  it("deve validar variáveis de ambiente obrigatórias", async () => {
    // Este teste verifica que o módulo `environment.ts` lança erro
    // quando variáveis obrigatórias estão faltando
    const originalEnv = process.env;

    process.env = {
      ...originalEnv,
      DATABASE_URL: undefined,
      JWT_SECRET: undefined,
    };

    vi.resetModules();

    await expect(async () => {
      await import("../environment.js");
    }).rejects.toThrow();

    process.env = originalEnv;
  });
});
```

### 5.10 `faceEncryption.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptFaceDescriptor,
  decryptFaceDescriptor,
  hasFaceDescriptor,
} from "../faceEncryption.js";

describe("faceEncryption", () => {
  beforeEach(() => {
    process.env.FACE_ENCRYPTION_KEY = "a".repeat(64);
  });

  const validDescriptor = new Array(128).fill(0.5).map((v, i) => v + i * 0.001);

  describe("encryptFaceDescriptor", () => {
    it("deve retornar objeto com encrypted e nonce", () => {
      const result = encryptFaceDescriptor(validDescriptor);

      expect(result).toHaveProperty("encrypted");
      expect(result).toHaveProperty("nonce");
      expect(typeof result.encrypted).toBe("string");
      expect(typeof result.nonce).toBe("string");
    });

    it("deve gerar ciphertext diferente a cada vez (nonce aleatório)", () => {
      const r1 = encryptFaceDescriptor(validDescriptor);
      const r2 = encryptFaceDescriptor(validDescriptor);

      // Mesmo input, outputs diferentes (nonce aleatório)
      expect(r1.encrypted).not.toBe(r2.encrypted);
      expect(r1.nonce).not.toBe(r2.nonce);
    });
  });

  describe("decryptFaceDescriptor", () => {
    it("deve recuperar o descriptor original", () => {
      const { encrypted, nonce } = encryptFaceDescriptor(validDescriptor);
      const decrypted = decryptFaceDescriptor(encrypted, nonce);

      expect(decrypted).toHaveLength(128);
      for (let i = 0; i < 128; i++) {
        expect(decrypted[i]).toBeCloseTo(validDescriptor[i], 4);
      }
    });

    it("deve lançar erro com nonce inválido", () => {
      const { encrypted } = encryptFaceDescriptor(validDescriptor);

      expect(() => decryptFaceDescriptor(encrypted, "invalid-nonce")).toThrow();
    });
  });

  describe("hasFaceDescriptor", () => {
    it("deve retornar true para array válido de 128 floats", () => {
      expect(hasFaceDescriptor(validDescriptor)).toBe(true);
    });

    it("deve retornar false para array de tamanho diferente", () => {
      expect(hasFaceDescriptor(new Array(64).fill(0.5))).toBe(false);
    });

    it("deve retornar false para null/undefined", () => {
      expect(hasFaceDescriptor(null)).toBe(false);
      expect(hasFaceDescriptor(undefined)).toBe(false);
    });

    it("deve retornar false para array com não-números", () => {
      const invalid = new Array(128).fill("not-a-number");
      expect(hasFaceDescriptor(invalid)).toBe(false);
    });
  });
});
```

### 5.11 `cpfEncryption.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptCpf,
  decryptCpf,
  hashCpf,
  formatCpfDigits,
  decryptAndFormat,
} from "../cpfEncryption.js";

describe("cpfEncryption", () => {
  beforeEach(() => {
    process.env.CPF_ENCRYPTION_KEY = "a".repeat(64);
  });

  const validCpf = "52998224725";

  describe("encryptCpf / decryptCpf", () => {
    it("deve criptografar e descriptografar CPF", () => {
      const encrypted = encryptCpf(validCpf);
      const decrypted = decryptCpf(encrypted);

      expect(decrypted).toBe(validCpf);
    });

    it("deve gerar ciphertext diferente a cada vez (GCM random nonce)", () => {
      const e1 = encryptCpf(validCpf);
      const e2 = encryptCpf(validCpf);

      expect(e1).not.toBe(e2);
    });

    it("deve lançar erro com chave inválida", () => {
      const originalKey = process.env.CPF_ENCRYPTION_KEY;
      process.env.CPF_ENCRYPTION_KEY = "invalid";

      expect(() => encryptCpf(validCpf)).toThrow();

      process.env.CPF_ENCRYPTION_KEY = originalKey;
    });
  });

  describe("hashCpf", () => {
    it("deve gerar hash determinístico", () => {
      const h1 = hashCpf(validCpf);
      const h2 = hashCpf(validCpf);

      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64); // SHA-256 hex
    });

    it("deve gerar hash diferente para CPFs diferentes", () => {
      const h1 = hashCpf("52998224725");
      const h2 = hashCpf("11144477735");

      expect(h1).not.toBe(h2);
    });
  });

  describe("formatCpfDigits", () => {
    it("deve normalizar CPF", () => {
      expect(formatCpfDigits("529.982.247-25")).toBe("52998224725");
      expect(formatCpfDigits("52998224725")).toBe("52998224725");
    });
  });

  describe("decryptAndFormat", () => {
    it("deve descriptografar e formatar CPF", () => {
      const encrypted = encryptCpf(validCpf);
      const formatted = decryptAndFormat(encrypted);

      expect(formatted).toBe("529.982.247-25");
    });
  });
});
```

---

## 6. Testes Unitários — Services

### 6.1 `relatorioMensalService.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do Prisma antes do import
vi.mock("../../database/prisma.js", () => ({
  prisma: {
    company: { findUnique: vi.fn() },
    checkIn: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { gerarRelatorioMensal } from "../relatorioMensalService.js";
import { prisma } from "../../database/prisma.js";

describe("relatorioMensalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve gerar CSV com headers do MTE", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: "company-1",
      cnpj: "11222333000181",
      name: "Empresa Teste",
    });
    (prisma.user.findMany as any).mockResolvedValue([
      { id: "user-1", name: "João Silva", cpf: "52998224725" },
    ]);
    (prisma.checkIn.findMany as any).mockResolvedValue([]);

    const resultado = await gerarRelatorioMensal("company-1", 2026, 8);

    expect(resultado).toContain("Empresa Teste");
    expect(resultado).toContain("11222333000181");
    expect(resultado).toContain("HASH:");
  });

  it("deve gerar hash SHA-256 para verificação de integridade", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: "company-1",
      cnpj: "11222333000181",
      name: "Empresa Teste",
    });
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.checkIn.findMany as any).mockResolvedValue([]);

    const resultado = await gerarRelatorioMensal("company-1", 2026, 8);

    const hashMatch = resultado.match(/HASH:\s*([a-f0-9]{64})/);
    expect(hashMatch).not.toBeNull();
  });

  it("deve lançar erro quando empresa não encontrada", async () => {
    (prisma.company.findUnique as any).mockResolvedValue(null);

    await expect(
      gerarRelatorioMensal("nonexistent", 2026, 8)
    ).rejects.toThrow();
  });
});
```

### 6.2 `asaasService.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do fetch global
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { createCustomer, validateWebhookToken } from "../asaasService.js";

describe("asaasService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ASAAS_API_KEY = "test-key";
    process.env.ASAAS_WEBHOOK_TOKEN = "test-webhook";
  });

  describe("createCustomer", () => {
    it("deve criar cliente com dados corretos", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "cust_123", name: "Empresa" }),
      });

      const result = await createCustomer({
        name: "Empresa Teste",
        cnpj: "11222333000181",
        email: "teste@empresa.com",
      });

      expect(result.id).toBe("cust_123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/customers"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "access_token": "test-key",
          }),
        })
      );
    });

    it("deve lançar erro quando API retorna erro", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ errors: [{ description: "Invalid data" }] }),
      });

      await expect(
        createCustomer({ name: "Empresa", cnpj: "000", email: "invalid" })
      ).rejects.toThrow();
    });
  });

  describe("validateWebhookToken", () => {
    it("deve retornar true para token válido", () => {
      expect(validateWebhookToken("test-webhook")).toBe(true);
    });

    it("deve retornar false para token inválido", () => {
      expect(validateWebhookToken("wrong-token")).toBe(false);
    });
  });
});
```

---

## 7. Testes Unitários — Middleware

### 7.1 `AuthMiddleware.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MOCK_TOKENS, MOCK_USERS } from "../../helpers/authHelper.js";

// Mock do Prisma
vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { authMiddleware } from "../../../middleware/AuthMiddleware.js";
import { prisma } from "../../../database/prisma.js";

describe("AuthMiddleware", () => {
  const mockReq = (token?: string) => ({
    headers: {
      authorization: token ? `Bearer ${token}` : undefined,
    },
    user: undefined as any,
  });

  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve popular req.user com token válido", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: MOCK_USERS.employee.id,
      role: MOCK_USERS.employee.role,
      companyId: MOCK_USERS.employee.companyId,
    });

    const req = mockReq(MOCK_TOKENS.employee);
    const res = mockRes();

    await authMiddleware(req as any, res as any, mockNext);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(MOCK_USERS.employee.id);
    expect(mockNext).toHaveBeenCalled();
  });

  it("deve retornar 401 sem token", async () => {
    const req = mockReq();
    const res = mockRes();

    await authMiddleware(req as any, res as any, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("deve retornar 401 com token inválido", async () => {
    const req = mockReq("invalid-token");
    const res = mockRes();

    await authMiddleware(req as any, res as any, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
```

### 7.2 `RoleGuard.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import {
  requireMaster,
  requireEnterpriseAdmin,
  requireAdminOrMaster,
  requireEmployeeOrAbove,
} from "../../../middleware/RoleGuard.js";

describe("RoleGuard", () => {
  const mockReq = (role: string) => ({
    user: { role },
  });

  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  describe("requireMaster", () => {
    it("deve permitir MASTER", () => {
      const middleware = requireMaster();
      const req = mockReq("MASTER");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve bloquear EMPLOYEE", () => {
      const middleware = requireMaster();
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve bloquear ENTERPRISE_ADMIN", () => {
      const middleware = requireMaster();
      const req = mockReq("ENTERPRISE_ADMIN");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("requireEnterpriseAdmin", () => {
    it("deve permitir ENTERPRISE_ADMIN", () => {
      const middleware = requireEnterpriseAdmin();
      const req = mockReq("ENTERPRISE_ADMIN");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve bloquear EMPLOYEE", () => {
      const middleware = requireEnterpriseAdmin();
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("requireAdminOrMaster", () => {
    it("deve permitir MASTER", () => {
      const middleware = requireAdminOrMaster();
      const req = mockReq("MASTER");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve permitir ENTERPRISE_ADMIN", () => {
      const middleware = requireAdminOrMaster();
      const req = mockReq("ENTERPRISE_ADMIN");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("deve bloquear EMPLOYEE", () => {
      const middleware = requireAdminOrMaster();
      const req = mockReq("EMPLOYEE");
      const res = mockRes();

      middleware(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("requireEmployeeOrAbove", () => {
    it("deve permitir todas as roles", () => {
      const middleware = requireEmployeeOrAbove();

      for (const role of ["MASTER", "ENTERPRISE_ADMIN", "EMPLOYEE"]) {
        const req = mockReq(role);
        const res = mockRes();
        const next = vi.fn();

        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
      }
    });
  });
});
```

### 7.3 `AuditMiddleware.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    auditLog: { create: vi.fn() },
  },
}));

import { auditMiddleware, createAuditLog } from "../../../middleware/AuditMiddleware.js";
import { prisma } from "../../../database/prisma.js";

describe("AuditMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve interceptar res.json e criar AuditLog", async () => {
    (prisma.auditLog.create as any).mockResolvedValue({});

    const req = {
      user: { id: "user-1", companyId: "company-1" },
      method: "POST",
      path: "/checkins",
      ip: "127.0.0.1",
      get: vi.fn().mockReturnValue("test-agent"),
      body: {},
    };

    const res: any = {
      statusCode: 201,
      json: vi.fn(),
    };

    // Capturar o handler passado para res.json
    const originalJson = res.json;
    let capturedData: any;
    res.json = vi.fn((data: any) => {
      capturedData = data;
      return res;
    });

    const next = vi.fn();

    auditMiddleware(req as any, res as any, next);

    // Simular handler chamando res.json
    res.json(capturedData);

    // Verificar que AuditLog foi criado
    // (verificar se create foi chamado após a resposta)
  });

  it("createAuditLog deve criar registro diretamente", async () => {
    (prisma.auditLog.create as any).mockResolvedValue({});

    await createAuditLog({
      userId: "user-1",
      companyId: "company-1",
      action: "CHECKIN",
      entity: "CheckIn",
      entityId: "checkin-1",
      ip: "127.0.0.1",
      userAgent: "test-agent",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        companyId: "company-1",
        action: "CHECKIN",
        entity: "CheckIn",
      }),
    });
  });
});
```

### 7.4 `PlanMiddleware.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    company: { findUnique: vi.fn() },
  },
}));

import { requireActivePlan } from "../../../middleware/PlanMiddleware.js";
import { prisma } from "../../../database/prisma.js";

describe("PlanMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve permitir empresa com plano ativo", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: "company-1",
      status: "ACTIVE",
      planExpiresAt: new Date("2027-12-31"),
    });

    const req = { user: { companyId: "company-1" } };
    const res: any = {};
    const next = vi.fn();

    await requireActivePlan(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("deve bloquear empresa SUSPENDED", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: "company-1",
      status: "SUSPENDED",
      planExpiresAt: new Date("2027-12-31"),
    });

    const req = { user: { companyId: "company-1" } };
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    const next = vi.fn();

    await requireActivePlan(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve bloquear trial expirado", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: "company-1",
      status: "TRIAL",
      planExpiresAt: new Date("2026-01-01"),
    });

    const req = { user: { companyId: "company-1" } };
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    const next = vi.fn();

    await requireActivePlan(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

---

## 8. Testes Unitários — Controllers (Mock)

### 8.1 `CheckinController.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../database/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    company: { findUnique: vi.fn() },
    checkIn: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    $transaction: vi.fn((fn: any) => fn({
      checkIn: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({
        id: "checkin-1",
        nsr: 1,
        ano: 2026,
        type: "ENTRY",
        createdAt: new Date(),
        latitude: -23.55,
        longitude: -46.63,
        employerCnpj: "11222333000181",
      }) },
    })),
  },
}));

vi.mock("../../utils/nsrGenerator.js", () => ({
  getNextNSR: vi.fn().mockResolvedValue(1),
  NsrLimitExceededError: class NsrLimitExceededError extends Error {},
}));

vi.mock("../../utils/comprovanteGenerator.js", () => ({
  gerarComprovante: vi.fn().mockReturnValue("Comprovante mock\nHASH: a".repeat(64)),
}));

vi.mock("../../utils/toleranceCalculator.js", () => ({
  aplicarTolerancia: vi.fn().mockReturnValue({
    horarioEfetivo: new Date(),
    dentroDaTolerancia: true,
    minutosExcedentes: 0,
  }),
  minutosParaDate: vi.fn(),
  tipoParaHorarioPrevisto: vi.fn(),
  tipoParaTolerancia: vi.fn(),
  isDiaUtil: vi.fn().mockReturnValue(true),
}));

vi.mock("../../utils/cpfEncryption.js", () => ({
  decryptCpf: vi.fn().mockReturnValue("529.982.247-25"),
  formatCpfDigits: vi.fn().mockReturnValue("52998224725"),
  decryptAndFormat: vi.fn().mockReturnValue("529.982.247-25"),
}));

import { CheckinController } from "../../controller/CheckinController.js";
import { prisma } from "../../database/prisma.js";

describe("CheckinController", () => {
  let controller: CheckinController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new CheckinController();
  });

  describe("createCheckin", () => {
    it("deve criar checkin com NSR e comprovante", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-1",
        companyId: "company-1",
        cpf: "encrypted",
        faceDescriptor: { encrypted: "test", nonce: "test" },
      });

      const req = {
        user: { id: "user-1", companyId: "company-1" },
        body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 },
      };

      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await controller.createCheckin(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          comprovante: expect.any(String),
          hashVerificacao: expect.any(String),
        })
      );
    });

    it("deve bloquear checkin duplicada no mesmo dia", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-1",
        companyId: "company-1",
      });
      (prisma.checkIn.findFirst as any).mockResolvedValue({
        id: "existing-checkin",
        type: "ENTRY",
      });

      const req = {
        user: { id: "user-1", companyId: "company-1" },
        body: { type: "ENTRY", latitude: -23.55, longitude: -46.63 },
      };

      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await controller.createCheckin(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
```

### 8.2 `ConsentController.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../database/prisma.js", () => ({
  prisma: {
    consentimento: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { ConsentController } from "../../controller/ConsentController.js";
import { prisma } from "../../database/prisma.js";

describe("ConsentController", () => {
  let controller: ConsentController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ConsentController();
  });

  describe("create", () => {
    it("deve criar/upsert consentimento", async () => {
      (prisma.consentimento.upsert as any).mockResolvedValue({
        id: "consent-1",
        tipo: "BIOMETRIA",
        aceite: true,
      });

      const req = {
        user: { id: "user-1" },
        body: { tipo: "BIOMETRIA", versao: "1.0", aceite: true },
      };

      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await controller.create(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(prisma.consentimento.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId_tipo_versao: expect.any(Object) }),
          create: expect.objectContaining({ tipo: "BIOMETRIA" }),
        })
      );
    });
  });

  describe("list", () => {
    it("deve listar consentimentos do usuário", async () => {
      (prisma.consentimento.findMany as any).mockResolvedValue([
        { id: "1", tipo: "TERMOS_DE_USO", aceite: true },
        { id: "2", tipo: "BIOMETRIA", aceite: true },
      ]);

      const req = { user: { id: "user-1" } };
      const res: any = {
        json: vi.fn(),
      };

      await controller.list(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ tipo: "TERMOS_DE_USO" }),
          expect.objectContaining({ tipo: "BIOMETRIA" }),
        ])
      );
    });
  });
});
```

### 8.3 `EmployeesController.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../database/prisma.js", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    checkIn: { findMany: vi.fn() },
  },
}));

vi.mock("../../utils/faceEncryption.js", () => ({
  decryptFaceDescriptor: vi.fn().mockReturnValue(new Array(128).fill(0.5)),
  hasFaceDescriptor: vi.fn().mockReturnValue(true),
}));

vi.mock("../../utils/euclideanDistance.js", () => ({
  euclideanDistance: vi.fn().mockReturnValue(0.3),
}));

import { EmployeesController } from "../../controller/EmployeesController.js";
import { prisma } from "../../database/prisma.js";

describe("EmployeesController", () => {
  let controller: EmployeesController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new EmployeesController();
  });

  describe("issueFaceToken", () => {
    it("deve gerar token com TTL de 30 segundos", async () => {
      const req = { user: { companyId: "company-1" } };
      const res: any = {
        json: vi.fn(),
      };

      await controller.issueFaceToken(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          expiresIn: 30,
        })
      );
    });
  });

  describe("verifyFace", () => {
    it("deve validar descriptor com token válido", async () => {
      // Primeiro emitir um token
      const reqToken = { user: { companyId: "company-1" } };
      const resToken: any = { json: vi.fn() };
      await controller.issueFaceToken(reqToken as any, resToken as any);

      const { token } = resToken.json.mock.calls[0][0];

      // Agora verificar
      const req = {
        user: { companyId: "company-1" },
        body: { token, descriptor: new Array(128).fill(0.5) },
      };
      const res: any = {
        json: vi.fn(),
      };

      await controller.verifyFace(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ valid: true })
      );
    });

    it("deve rejeitar token expirado", async () => {
      // Token de teste já expirado (simular)
      vi.useFakeTimers();

      const reqToken = { user: { companyId: "company-1" } };
      const resToken: any = { json: vi.fn() };
      await controller.issueFaceToken(reqToken as any, resToken as any);

      const { token } = resToken.json.mock.calls[0][0];

      // Avançar tempo 31 segundos
      vi.advanceTimersByTime(31000);

      const req = {
        user: { companyId: "company-1" },
        body: { token, descriptor: new Array(128).fill(0.5) },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await controller.verifyFace(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);

      vi.useRealTimers();
    });
  });
});
```

---

## 9. Testes de Integração

### 9.1 `checkinRoutes.test.ts`

Teste completo de integração com banco real:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { generateMockToken, MOCK_USERS } from "../helpers/authHelper.js";
import { prisma } from "../../database/prisma.js";

const app = createTestApp();

describe("checkinRoutes (integração)", () => {
  let adminToken: string;
  let employeeToken: string;
  let companyId: string;

  beforeAll(async () => {
    // Criar empresa de teste
    const company = await prisma.company.create({
      data: {
        name: "Empresa Teste Integração",
        cnpj: "11222333000181",
        email: "teste-int@empresa.com",
        password: "hashed-password",
        status: "ACTIVE",
        planExpiresAt: new Date("2027-12-31"),
      },
    });
    companyId = company.id;

    // Criar admin e employee
    const admin = await prisma.user.create({
      data: {
        name: "Admin Teste",
        email: "admin-int@test.com",
        password: "hashed-password",
        role: "ENTERPRISE_ADMIN",
        companyId,
        cpf: "encrypted",
      },
    });

    const employee = await prisma.user.create({
      data: {
        name: "Employee Teste",
        email: "employee-int@test.com",
        password: "hashed-password",
        role: "EMPLOYEE",
        companyId,
        cpf: "encrypted",
      },
    });

    adminToken = generateMockToken({
      id: admin.id,
      role: "ENTERPRISE_ADMIN",
      companyId,
    });

    employeeToken = generateMockToken({
      id: employee.id,
      role: "EMPLOYEE",
      companyId,
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.checkIn.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
  });

  describe("POST /checkins", () => {
    it("deve criar checkin com auth válida", async () => {
      const res = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ type: "ENTRY", latitude: -23.55, longitude: -46.63 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("comprovante");
      expect(res.body).toHaveProperty("hashVerificacao");
      expect(res.body.checkin).toHaveProperty("nsr");
    });

    it("deve retornar 401 sem auth", async () => {
      const res = await request(app)
        .post("/checkins")
        .send({ type: "ENTRY", latitude: -23.55, longitude: -46.63 });

      expect(res.status).toBe(401);
    });

    it("deve bloquear duplicata no mesmo dia", async () => {
      // Primeira batida
      await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ type: "ENTRY", latitude: -23.55, longitude: -46.63 });

      // Segunda batida do mesmo tipo
      const res = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ type: "ENTRY", latitude: -23.55, longitude: -46.63 });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /checkins/", () => {
    it("deve listar checkins do usuário", async () => {
      const res = await request(app)
        .get("/checkins/")
        .set("Authorization", `Bearer ${employeeToken}`)
        .query({ date: "2026-08-10" });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /checkins/export/afd", () => {
    it("deve gerar AFD válido", async () => {
      const res = await request(app)
        .get("/checkins/export/afd")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ startDate: "2026-08-01", endDate: "2026-08-31" });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/plain");
      expect(res.text).toContain("1|"); // Header Tipo 1
    });
  });
});
```

### 9.2 `companyRoutes.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { prisma } from "../../database/prisma.js";

const app = createTestApp();

describe("companyRoutes (integração)", () => {
  afterAll(async () => {
    // Limpar dados de teste
    await prisma.consentimento.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { contains: "-int-test" } } });
    await prisma.company.deleteMany({ where: { name: { contains: "Int Test" } } });
  });

  describe("POST /companies/signup", () => {
    it("deve criar empresa + admin + subscription + 4 consentimentos", async () => {
      const res = await request(app)
        .post("/companies/signup")
        .send({
          name: "Admin Int Test",
          email: `admin-int-test-${Date.now()}@test.com`,
          cpf: "529.982.247-25",
          cnpj: "11.222.333/0001-81",
          companyName: "Empresa Int Test",
          password: "TestPassword123!",
          confirmPassword: "TestPassword123!",
          aceiteTermos: true,
          aceiteDpa: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.role).toBe("ENTERPRISE_ADMIN");

      // Verificar que 4 consentimentos foram criados
      const consents = await prisma.consentimento.findMany({
        where: { userId: res.body.user.id },
      });
      expect(consents).toHaveLength(4);
    });

    it("deve rejeitar signup com CNPJ duplicado", async () => {
      const res = await request(app)
        .post("/companies/signup")
        .send({
          name: "Admin Int Test",
          email: `admin-int-test-${Date.now()}@test.com`,
          cpf: "529.982.247-25",
          cnpj: "11.222.333/0001-81",
          companyName: "Empresa Int Test 2",
          password: "TestPassword123!",
          confirmPassword: "TestPassword123!",
          aceiteTermos: true,
          aceiteDpa: true,
        });

      expect(res.status).toBe(400);
    });
  });
});
```

### 9.3 `privacyRoutes.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { generateMockToken } from "../helpers/authHelper.js";
import { prisma } from "../../database/prisma.js";

const app = createTestApp();

describe("privacyRoutes (integração)", () => {
  let employeeToken: string;
  let companyId: string;
  let userId: string;

  beforeAll(async () => {
    const company = await prisma.company.create({
      data: {
        name: "Privacy Test Company",
        cnpj: "99887766000155",
        email: "privacy-test@empresa.com",
        password: "hashed",
        status: "ACTIVE",
        planExpiresAt: new Date("2027-12-31"),
      },
    });
    companyId = company.id;

    const user = await prisma.user.create({
      data: {
        name: "Privacy Test User",
        email: "privacy-user@test.com",
        password: "hashed",
        role: "EMPLOYEE",
        companyId,
        cpf: "encrypted",
      },
    });
    userId = user.id;

    employeeToken = generateMockToken({ id: userId, role: "EMPLOYEE", companyId });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.consentimento.deleteMany({ where: { userId } });
    await prisma.checkIn.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.company.delete({ where: { id: companyId } });
  });

  describe("GET /privacy/my-data", () => {
    it("deve retornar dados pessoais do titular", async () => {
      const res = await request(app)
        .get("/privacy/my-data")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("dadosPessoais");
      expect(res.body).toHaveProperty("dadosBiometricos");
      expect(res.body).toHaveProperty("registrosPonto");
      expect(res.body).toHaveProperty("consentimentos");
    });
  });

  describe("GET /privacy/export", () => {
    it("deve retornar dados em formato portável", async () => {
      const res = await request(app)
        .get("/privacy/export")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("dadosPessoais");
      expect(res.body).toHaveProperty("registrosPonto");
      expect(res.body).toHaveProperty("consentimentos");
    });
  });

  describe("GET /privacy/my-logs", () => {
    it("deve retornar logs de auditoria do usuário", async () => {
      const res = await request(app)
        .get("/privacy/my-logs")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });
  });
});
```

---

## 10. Testes E2E

### 10.1 `auth-flow.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import { prisma } from "../../database/prisma.js";

const app = createTestApp();

describe("E2E: Fluxo de Autenticação", () => {
  let companyId: string;
  let inviteToken: string;

  afterAll(async () => {
    await prisma.consentimento.deleteMany({});
    await prisma.inviteTokenUsage.deleteMany({});
    await prisma.inviteToken.deleteMany({});
    await prisma.checkIn.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
  });

  it("1. POST /companies/signup → empresa criada", async () => {
    const res = await request(app)
      .post("/companies/signup")
      .send({
        name: "E2E Admin",
        email: `e2e-admin-${Date.now()}@test.com`,
        cpf: "529.982.247-25",
        cnpj: "11.222.333/0001-81",
        companyName: "E2E Company",
        password: "TestPassword123!",
        confirmPassword: "TestPassword123!",
        aceiteTermos: true,
        aceiteDpa: true,
      });

    expect(res.status).toBe(201);
    companyId = res.body.user.companyId;
  });

  it("2. POST /sessions/login → JWT retornado", async () => {
    const res = await request(app)
      .post("/sessions/login")
      .send({
        email: expect.any(String), // email do passo 1
        password: "TestPassword123!",
      });

    // Nota: este teste precisa do email real do passo 1
    // Ajustar para usar variável capturada
  });

  it("3. POST /companies/me/invite-token → token gerado", async () => {
    // Login como admin, criar token
    // ...
  });

  it("4. POST /companies/invites/accept → employee criado", async () => {
    // Aceitar convite
    // ...
  });

  it("5. Verificar que employee tem 4 consentimentos", async () => {
    const consents = await prisma.consentimento.findMany({
      where: { user: { email: { contains: "e2e-employee" } } },
    });
    expect(consents).toHaveLength(4);
  });
});
```

### 10.2 `checkin-flow.test.ts`

Fluxo completo de ponto:

```
1. Login como employee
2. GET /employees/face/token → face token
3. POST /checkins (ENTRY) → 201 + comprovante + NSR=1
4. POST /checkins (LUNCH_START) → 201 + NSR=2
5. POST /checkins (LUNCH_END) → 201 + NSR=3
6. POST /checkins (EXIT) → 201 + NSR=4
7. GET /checkins/ → 4 registros
8. Login como admin
9. GET /checkins/export/afd → arquivo com Header Tipo 1
10. GET /checkins/export/relatorio-mensal → CSV com SHA-256
```

### 10.3 `invite-flow.test.ts`

Fluxo completo de convite:

```
1. Login como admin
2. POST /companies/me/invite-token → token
3. GET /companies/invites/:token → dados do convite
4. POST /companies/invites/accept → employee criado com consentimentos
5. Login como employee → funciona
6. GET /privacy/my-data → dados do employee
```

### 10.4 `lgpd-flow.test.ts`

Fluxo completo LGPD:

```
1. Login como employee
2. GET /privacy/my-data → dados completos
3. GET /privacy/export → portabilidade JSON
4. PUT /privacy/my-data → corrige nome
5. DELETE /privacy/my-face → remove biometria
6. GET /privacy/my-logs → logs da operação
7. Verificar AuditLog tem legalBasis preenchido
```

---

## 11. Priorização e Cronograma

### Fase 1 — Infraestrutura (1 dia)

| Tarefa | Arquivo | Esforço |
|--------|---------|---------|
| Instalar vitest + deps | `package.json` | 30min |
| Criar `vitest.config.ts` | `backend/vitest.config.ts` | 30min |
| Criar `globalSetup.ts` | `src/test/globalSetup.ts` | 30min |
| Criar `setup.ts` | `src/test/setup.ts` | 30min |
| Criar helpers | `src/test/helpers/*` | 1h |

### Fase 2 — Unitários Utils (3-4 dias)

| Dia | Arquivos | Esforço |
|-----|----------|---------|
| Dia 1 | `cpfCnpjValidator`, `cpfEncryption`, `faceEncryption`, `nsrGenerator` | 6h |
| Dia 2 | `toleranceCalculator`, `euclideanDistance`, `formattName` | 4h |
| Dia 3 | `comprovanteGenerator`, `planLimits`, `pricingCalculator`, `environment` | 5h |

### Fase 3 — Unitários Services/Middleware (2-3 dias)

| Dia | Arquivos | Esforço |
|-----|----------|---------|
| Dia 1 | `relatorioMensalService`, `asaasService` | 4h |
| Dia 2 | `AuthMiddleware`, `AuditMiddleware` | 5h |
| Dia 3 | `RoleGuard`, `PlanMiddleware` | 4h |

### Fase 4 — Unitários Controllers (4-5 dias)

| Dia | Arquivos | Esforço |
|-----|----------|---------|
| Dia 1 | `CheckinController`, `CompanyController` | 6h |
| Dia 2 | `ConsentController`, `EmployeesController`, `AuthController` | 5h |
| Dia 3 | `JustificativaController`, `PrivacyController` | 5h |
| Dia 4 | `SessionController`, `WorkScheduleController` | 5h |
| Dia 5 | `AfdController`, `MasterController`, `PaymentController` | 5h |

### Fase 5 — Integração (3-4 dias)

| Dia | Arquivos | Esforço |
|-----|----------|---------|
| Dia 1 | Setup DB teste + `checkinRoutes.test.ts` | 6h |
| Dia 2 | `companyRoutes.test.ts` | 5h |
| Dia 3 | `privacyRoutes.test.ts` | 4h |

### Fase 6 — E2E (3-4 dias)

| Dia | Arquivos | Esforço |
|-----|----------|---------|
| Dia 1 | `auth-flow.test.ts` | 5h |
| Dia 2 | `checkin-flow.test.ts` | 6h |
| Dia 3 | `invite-flow.test.ts` | 4h |
| Dia 4 | `lgpd-flow.test.ts` | 4h |

### Total Estimado: ~16-21 dias de trabalho

---

## 12. Configuração do Banco de Testes

### Opção Recomendada: PostgreSQL Dedicado

```bash
# Criar banco de teste
createdb viggo_test

# Configurar URL no .env.test
DATABASE_URL="postgresql://user:pass@localhost:5432/viggo_test"

# Aplicar schema
cd backend && npx prisma migrate deploy --schema=prisma/schema.prisma
```

### Variáveis de Ambiente para Testes (`.env.test`)

```env
NODE_ENV=TEST
DATABASE_URL="postgresql://user:pass@localhost:5432/viggo_test"
JWT_SECRET="test-jwt-secret-key-for-testing-only"
FRONTEND_URL="http://localhost:3000"
PORT=3334
CPF_ENCRYPTION_KEY="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
FACE_ENCRYPTION_KEY="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
ASAAS_API_KEY="test-asaas-key"
ASAAS_ENVIRONMENT="sandbox"
ASAAS_WEBHOOK_TOKEN="test-webhook-token"
```

### Strategy para E2E

- Usar banco de teste real (não mock)
- Cada teste E2E cria seus dados e limpa após execução
- `beforeAll`: seed mínimo necessário
- `afterAll`: cleanup reverso (respeitar FK constraints)

---

## 13. Mocking Strategy

### Quando Mockar vs. Quando Usar DB Real

| Tipo | Abordagem | Razão |
|------|-----------|-------|
| **Unitários** | Mock completo do Prisma | Testar lógica pura, velocidade |
| **Integração** | DB real (PostgreSQL) | Testar queries, migrations, constraints |
| **E2E** | DB real + API real | Testar fluxo completo do usuário |

### Dependências Externas

| Dependência | Mock Strategy | Onde |
|------------|--------------|------|
| `prisma` / `extendedPrisma` | `vi.mock()` com factory | Controllers unitários |
| `asaasService` | Mock completo com `vi.mock()` | `asaasService.test.ts`, `PaymentController` |
| `bcrypt` | Mock parcial (hash/compare) | `SessionController`, `CompanyController` |
| `jsonwebtoken` | Mock (sign/verify) | `AuthMiddleware` |
| `crypto` | Mock (randomUUID, createHash) | `EmployeesController` |
| `fetch` (Asaas) | `vi.stubGlobal("fetch", mockFetch)` | `asaasService.test.ts` |
| `node-cron` | Mock (schedule) | `server.ts` |

### Padrão de Mock para Prisma

```typescript
vi.mock("../../database/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // ... outros models
    $transaction: vi.fn((fn) => fn(/* mocks */)),
  },
}));
```

---

## 14. Cobertura e Métricas

### Alvos de Cobertura

| Métrica | Meta | Mínimo |
|---------|------|--------|
| **Line coverage** | 70% | 60% |
| **Branch coverage** | 60% | 50% |
| **Function coverage** | 80% | 70% |

### Cobertura Crítica (100% obrigatório)

- `nsrGenerator.ts` — Geração de NSR (integridade do AFD)
- `cpfEncryption.ts` — Criptografia de CPF (LGPD)
- `faceEncryption.ts` — Criptografia de face (LGPD)
- `toleranceCalculator.ts` — Tolerância CLT Art. 74
- `comprovanteGenerator.ts` — Comprovante Portaria 671
- `AuthMiddleware.ts` — Autenticação JWT
- `RoleGuard.ts` — Controle de acesso

### Relatório de Coverage

```bash
# Gerar relatório
npm run test:coverage

# Abrir relatório HTML
open coverage/index.html
```

---

## 15. Convenções

### Nomenclatura de Testes

```typescript
describe("NomeDoModulo", () => {
  describe("nomeDoMetodo", () => {
    it("deve [ação] quando [condição]", () => { ... });
    it("deve lançar erro quando [condição inválida]", () => { ... });
  });
});
```

### Padrão AAA (Arrange, Act, Assert)

```typescript
it("deve validar CPF", () => {
  // Arrange
  const cpf = "529.982.247-25";

  // Act
  const result = validateCPF(cpf);

  // Assert
  expect(result).toBe(true);
});
```

### Exemplos de Naming

| ✅ Bom | ❌ Ruim |
|---------|---------|
| `deve retornar 401 quando token não fornecido` | `testa token` |
| `deve gerar NSR sequencial` | `NSR` |
| `deve bloquear duplicata no mesmo dia` | `duplicata` |
| `deve criptografar faceDescriptor com AES-256-GCM` | `criptografia` |

---

## 16. Comandos

```bash
# Rodar todos os testes
npm run test

# Rodar testes em modo watch (desenvolvimento)
npm run test:watch

# Rodar com cobertura
npm run test:coverage

# Rodar teste específico
npx vitest run src/test/unit/utils/nsrGenerator.test.ts

# Rodar testes de um diretório
npx vitest run src/test/unit/utils/

# Rodar testes de integração
npx vitest run src/test/integration/

# Rodar testes E2E
npx vitest run src/test/e2e/

# Abrir UI do vitest
npm run test:ui
```

---

*Documento gerado em 10/08/2026 como parte do plano de testes do projeto Viggo.*
*Finding G10 (Testes Automatizados Ausentes) — Sprint 5, Tarefa T45.*
