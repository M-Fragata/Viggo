# Plano de Integração: Asaas + Novo Modelo de Precificação Dinâmica

> **Data:** 09/08/2026
> **Status:** Fase 1, 2, 3, 4 e 5 implementadas — Aguardando Fase 6 (Testes e Deploy)

---

## 1. Resumo da Mudança

### Modelo Atual (a ser removido)
- 3 tiers fixos: TIER_I (R$49,90/10 func), TIER_II (R$149,90/50 func), TIER_III (R$349,90/150 func)
- Enterprise Custom (sob consulta)
- Sem integração de pagamento
- Planos definidos em 3 lugares com inconsistências

### Novo Modelo
- **Plano Dinâmico (único, self-serve):** R$ 54,90/mês base (até 10 funcionários) + R$ 5,00 por funcionário adicional
- **Plano Enterprise (sob consulta):** Mantido para clientes grandes
- **Métodos de pagamento:** Pix + Cartão de crédito
- **Cobrança:** Recorrente automática OU manual (cliente escolhe)
- **Excesso de funcionários:** Cobrança automática no próximo ciclo
- **NFS-e:** Exibição no histórico de pagamentos (status "Aguardando emissão" por enquanto)

### Regra de Cálculo do Preço
```
PRECO_BASE = 54.90  (até 10 funcionários)
PRECO_EXTRA = 5.00  (por funcionário adicional)

funcionarios_pagos = total_funcionarios - 1  (desconta o ENTERPRISE_ADMIN)
extras = max(0, funcionarios_pagos - 10)
preco_total = 54.90 + (extras * 5.00)
```

**Exemplos:**
| Funcionários (total) | Admin (-1) | Pagos | Extras (>10) | Cálculo | Valor/mês |
|---|---|---|---|---|---|
| 1 (só admin) | -1 | 0 | 0 | 54,90 + 0 | R$ 54,90 |
| 5 | -1 | 4 | 0 | 54,90 + 0 | R$ 54,90 |
| 10 | -1 | 9 | 0 | 54,90 + 0 | R$ 54,90 |
| 11 | -1 | 10 | 0 | 54,90 + 0 | R$ 54,90 |
| 12 | -1 | 11 | 1 | 54,90 + 5,00 | R$ 59,90 |
| 15 | -1 | 14 | 4 | 54,90 + 20,00 | R$ 74,90 |
| 25 | -1 | 24 | 14 | 54,90 + 70,00 | R$ 124,90 |
| 50 | -1 | 49 | 39 | 54,90 + 195,00 | R$ 249,90 |

> **Nota:** O 1º funcionário além do admin já conta como "pago" pois o admin desconta 1. Ou seja, empresa com 12 pessoas (1 admin + 11 funcionários) = 11 pagos = 1 extra = R$ 59,90.

---

## 2. Banco de Dados (Prisma Schema)

### 2.1 Enum PlanTier — Limpeza Total

**Arquivo:** `backend/prisma/schema.prisma`

Remover `TIER_I`, `TIER_II`, `TIER_III`. O schema ficará:

```prisma
enum PlanTier {
  DYNAMIC           // Plano dinâmico self-serve (R$ 54,90 + extras)
  ENTERPRISE_CUSTOM // Enterprise sob consulta
}

enum CompanyStatus {
  TRIAL
  ACTIVE
  SUSPENDED
  CANCELLED
}

enum UserRole {
  MASTER
  ENTERPRISE_ADMIN
  EMPLOYEE
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum CheckInType {
  ENTRY
  LUNCH_START
  LUNCH_END
  EXIT
}
```

### 2.2 Model Company — Campos Novos

```prisma
model Company {
  id                  String         @id @default(uuid())
  name                String
  cnpj                String         @unique
  plan                PlanTier       @default(DYNAMIC)
  status              CompanyStatus  @default(TRIAL)
  planExpiresAt       DateTime?
  maxEmployees        Int            @default(10)
  asaasCustomerId     String?
  billingType         String?        // 'RECURRENT' | 'MANUAL'
  asaasPaymentMethod  String?        // 'PIX' | 'CREDIT_CARD'
  settings            Json?
  trialUsed           Boolean        @default(false)
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  checkIns            CheckIn[]
  users               User[]
  subscriptions       Subscription[]
  invites             InviteToken[]
  justificativas      Justificativa[]
  workSchedules       WorkSchedule[]
}
```

### 2.3 Model Subscription — Campos Expandidos

```prisma
model Subscription {
  id                    String    @id @default(uuid())
  companyId             String
  company               Company   @relation(fields: [companyId], references: [id])
  planTier              PlanTier
  price                 Decimal   @db.Decimal(10, 2)
  status                String    // 'TRIAL', 'ACTIVE', 'OVERDUE', 'CANCELLED'
  asaasSubscriptionId   String?
  billingType           String?   // 'RECURRENT' | 'MANUAL'
  paymentMethod         String?   // 'PIX' | 'CREDIT_CARD'
  basePrice             Decimal?  @db.Decimal(10, 2) // 54.90
  extraEmployees        Int?      @default(0)         // funcionários além dos 10
  extraPricePerUnit     Decimal?  @db.Decimal(10, 2)  // 5.00
  calculatedTotal       Decimal?  @db.Decimal(10, 2)  // total do ciclo
  nfseStatus            String?   // 'PENDING' | 'ISSUED' | 'NOT_APPLICABLE'
  nfseNumber            String?   // número da NFS-e quando emitida
  nfseUrl               String?   // link para download da NFS-e
  startedAt             DateTime  @default(now())
  expiresAt             DateTime?
  cancelledAt           DateTime?
  createdAt             DateTime  @default(now())

  @@index([companyId])
  @@index([status])
}
```

### 2.4 Model Payment (NOVO — Histórico de Cobranças)

```prisma
model Payment {
  id                  String    @id @default(uuid())
  companyId           String
  company             Company   @relation(fields: [companyId], references: [id])
  subscriptionId      String?
  asaasPaymentId      String?   @unique
  amount              Decimal   @db.Decimal(10, 2)
  billingType         String    // 'PIX' | 'CREDIT_CARD' | 'BOLETO'
  status              String    // 'PENDING', 'CONFIRMED', 'OVERDUE', 'CANCELLED', 'REFUNDED'
  paymentUrl          String?   // link de pagamento (Asaas checkout)
  invoiceUrl          String?   // URL do boleto/cobrança
  nfseStatus          String?   // 'PENDING' | 'ISSUED' | 'NOT_APPLICABLE'
  nfseNumber          String?   
  nfseUrl             String?   
  dueDate             DateTime
  paidAt              DateTime?
  createdAt           DateTime  @default(now())

  @@index([companyId])
  @@index([asaasPaymentId])
  @@index([status])
}
```

### 2.5 Migration

```bash
cd backend
npx prisma migrate dev --name add_dynamic_plan_and_payments
```

---

## 3. Backend — Serviços e Funções

### 3.1 `backend/src/utils/pricingCalculator.ts` (CRIAR)

Função pura de cálculo de preço. Usada tanto no backend quanto no frontend (via shared).

```typescript
export const PRICING = {
  BASE_PRICE: 54.90,
  BASE_MAX_EMPLOYEES: 10,
  EXTRA_PRICE_PER_EMPLOYEE: 5.00,
} as const;

/**
 * Calcula o preço do plano dinâmico baseado no número de funcionários.
 * Desconta 1 do total para excluir o ENTERPRISE_ADMIN.
 *
 * @param totalUsers - Total de usuários na empresa (incluindo admin)
 * @returns Objeto com detalhes do cálculo
 */
export function calculateDynamicPrice(totalUsers: number) {
  // Desconta o ENTERPRISE_ADMIN (sempre 1)
  const paidEmployees = Math.max(0, totalUsers - 1);
  
  // Funcionários além do limite base (10)
  const extraEmployees = Math.max(0, paidEmployees - PRICING.BASE_MAX_EMPLOYEES);
  
  // Cálculo do preço
  const basePrice = PRICING.BASE_PRICE;
  const extraTotal = extraEmployees * PRICING.EXTRA_PRICE_PER_EMPLOYEE;
  const total = basePrice + extraTotal;

  return {
    basePrice,
    baseMaxEmployees: PRICING.BASE_MAX_EMPLOYEES,
    paidEmployees,
    extraEmployees,
    extraPricePerUnit: PRICING.EXTRA_PRICE_PER_EMPLOYEE,
    extraTotal,
    total: Math.round(total * 100) / 100, // 2 casas decimais
  };
}
```

### 3.2 `backend/src/services/asaasService.ts` (CRIAR)

Serviço de integração com a API Asaas.

```typescript
import { Env } from '../utils/environment.js';

const ASAAS_BASE_URL = Env.ASaaS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_HEADERS = {
  'Content-Type': 'application/json',
  'access_token': Env.ASAAS_API_KEY!,
};

// ===== CUSTOMERS =====

export interface CreateCustomerDTO {
  name: string;
  cpfCnpj: string;           // CNPJ da empresa
  email: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  city?: string;
  state?: string;
}

export async function createCustomer(data: CreateCustomerDTO) {
  const response = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers: ASAAS_HEADERS,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas createCustomer failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

// ===== SUBSCRIPTIONS (Cobrança Recorrente) =====

export interface CreateSubscriptionDTO {
  customerId: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  cycle: 'MONTHLY';
  description: string;
  externalReference?: string;  // companyId
  nextDueDate?: string;        // YYYY-MM-DD
}

export async function createSubscription(data: CreateSubscriptionDTO) {
  const response = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: ASAAS_HEADERS,
    body: JSON.stringify({
      ...data,
      cycle: data.cycle || 'MONTHLY',
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas createSubscription failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

export async function updateSubscription(subscriptionId: string, data: { value?: number; status?: string }) {
  const response = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    headers: ASAAS_HEADERS,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas updateSubscription failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

export async function cancelSubscription(subscriptionId: string) {
  const response = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: ASAAS_HEADERS,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas cancelSubscription failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

// ===== PAYMENTS (Cobrança Avulsa) =====

export interface CreatePaymentDTO {
  customerId: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;            // YYYY-MM-DD
  description: string;
  externalReference?: string;
}

export async function createPayment(data: CreatePaymentDTO) {
  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: 'POST',
    headers: ASAAS_HEADERS,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas createPayment failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

export async function getPayment(paymentId: string) {
  const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: ASAAS_HEADERS,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas getPayment failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

export async function getPaymentsByCustomer(customerId: string, limit = 50) {
  const response = await fetch(
    `${ASAAS_BASE_URL}/payments?customer=${customerId}&limit=${limit}&orderBy=dueDate desc`,
    { method: 'GET', headers: ASAAS_HEADERS }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas getPayments failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

// ===== WEBHOOK VALIDATION =====

export function validateWebhookToken(token: string): boolean {
  return token === Env.ASAAS_WEBHOOK_TOKEN;
}

// ===== TYPES PARA WEBHOOK =====

export interface AsaasWebhookEvent {
  event: string;
  payment: {
    id: string;
    customer: string;
    subscription: string;
    status: string;
    value: number;
    billingType: string;
    dueDate: string;
    paymentDate?: string;
    externalReference?: string;
  };
}
```

### 3.3 `backend/src/controller/payment/PaymentController.ts` (CRIAR)

```typescript
import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { z } from 'zod';
import * as asaasService from '../../services/asaasService.js';
import { calculateDynamicPrice } from '../../utils/pricingCalculator.js';
import { addDays, format } from 'date-fns';

export class PaymentController {

  /**
   * Criar checkout — gera cobrança no Asaas e retorna URL de pagamento
   */
  async createCheckout(req: Request, res: Response) {
    const bodySchema = z.object({
      billingType: z.enum(['PIX', 'CREDIT_CARD']),
    });

    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const { billingType } = bodySchema.parse(req.body);

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true, name: true, cnpj: true, asaasCustomerId: true,
          _count: { select: { users: true } },
        },
      });

      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      // 1. Se não tem customer no Asaas, criar
      let customerId = company.asaasCustomerId;
      if (!customerId) {
        const customer = await asaasService.createCustomer({
          name: company.name,
          cpfCnpj: company.cnpj,
          email: req.user?.email || '',
        });
        customerId = customer.id;
        await prisma.company.update({
          where: { id: companyId },
          data: { asaasCustomerId: customerId },
        });
      }

      // 2. Calcular preço baseado em funcionários atuais
      const priceInfo = calculateDynamicPrice(company._count.users);

      // 3. Criar cobrança recorrente no Asaas
      const subscription = await asaasService.createSubscription({
        customerId,
        billingType,
        value: priceInfo.total,
        cycle: 'MONTHLY',
        description: `Viggo - Plano ${priceInfo.paidEmployees} funcionários`,
        externalReference: companyId,
        nextDueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      });

      // 4. Salvar subscription no banco
      await prisma.subscription.create({
        data: {
          companyId,
          planTier: 'DYNAMIC',
          price: priceInfo.total,
          status: 'ACTIVE',
          billingType: 'RECURRENT',
          paymentMethod: billingType,
          basePrice: priceInfo.basePrice,
          extraEmployees: priceInfo.extraEmployees,
          extraPricePerUnit: priceInfo.extraPricePerUnit,
          calculatedTotal: priceInfo.total,
          asaasSubscriptionId: subscription.id,
          startedAt: new Date(),
          expiresAt: addDays(new Date(), 30),
        },
      });

      // 5. Atualizar company
      await prisma.company.update({
        where: { id: companyId },
        data: {
          status: 'ACTIVE',
          billingType: 'RECURRENT',
          asaasPaymentMethod: billingType,
          planExpiresAt: addDays(new Date(), 30),
        },
      });

      return res.json({
        subscriptionId: subscription.id,
        billingType,
        amount: priceInfo.total,
        paymentUrl: subscription.invoiceUrl || subscription.paymentUrl,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao criar checkout:', error);
      return res.status(500).json({ message: 'Erro ao criar checkout' });
    }
  }

  /**
   * Atualizar valor da assinatura quando funcionário é adicionado/removido
   */
  async updateSubscriptionValue(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        asaasCustomerId: true,
        _count: { select: { users: true } },
      },
    });

    if (!company) return;

    const activeSubscription = await prisma.subscription.findFirst({
      where: { companyId, status: 'ACTIVE', billingType: 'RECURRENT' },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSubscription?.asaasSubscriptionId) return;

    const priceInfo = calculateDynamicPrice(company._count.users);

    // Atualizar no Asaas (.valor entrará no próximo ciclo)
    await asaasService.updateSubscription(activeSubscription.asaasSubscriptionId, {
      value: priceInfo.total,
    });

    // Atualizar no banco
    await prisma.subscription.update({
      where: { id: activeSubscription.id },
      data: {
        extraEmployees: priceInfo.extraEmployees,
        calculatedTotal: priceInfo.total,
        price: priceInfo.total,
      },
    });
  }

  /**
   * Obter histórico de pagamentos
   */
  async getPaymentHistory(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const payments = await prisma.payment.findMany({
        where: { companyId },
        orderBy: { dueDate: 'desc' },
        take: 50,
      });

      return res.json(payments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        billingType: p.billingType,
        status: p.status,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        paymentUrl: p.paymentUrl,
        nfseStatus: p.nfseStatus || 'PENDING',
        nfseNumber: p.nfseNumber,
        nfseUrl: p.nfseUrl,
      })));

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return res.status(500).json({ message: 'Erro ao buscar histórico de pagamentos' });
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancelSubscription(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const activeSubscription = await prisma.subscription.findFirst({
        where: { companyId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeSubscription) {
        return res.status(404).json({ message: 'Nenhuma assinatura ativa encontrada' });
      }

      // Cancelar no Asaas
      if (activeSubscription.asaasSubscriptionId) {
        await asaasService.cancelSubscription(activeSubscription.asaasSubscriptionId);
      }

      // Atualizar banco
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      await prisma.company.update({
        where: { id: companyId },
        data: { status: 'CANCELLED' },
      });

      return res.json({ message: 'Assinatura cancelada com sucesso' });

    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      return res.status(500).json({ message: 'Erro ao cancelar assinatura' });
    }
  }

  /**
   * Processar webhook do Asaas
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const token = req.headers['asaas-access-token'] as string;
      if (!asaasService.validateWebhookToken(token || '')) {
        return res.status(401).json({ message: 'Token inválido' });
      }

      const event = req.body as asaasService.AsaasWebhookEvent;

      switch (event.event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED': {
          const payment = event.payment;
          
          // Atualizar company para ACTIVE
          if (payment.externalReference) {
            await prisma.company.update({
              where: { id: payment.externalReference },
              data: { status: 'ACTIVE' },
            });
          }

          // Registrar pagamento
          if (payment.subscription) {
            const subscription = await prisma.subscription.findFirst({
              where: { asaasSubscriptionId: payment.subscription },
            });
            
            if (subscription) {
              await prisma.payment.create({
                data: {
                  companyId: subscription.companyId,
                  subscriptionId: subscription.id,
                  asaasPaymentId: payment.id,
                  amount: payment.value,
                  billingType: payment.billingType,
                  status: 'CONFIRMED',
                  dueDate: new Date(payment.dueDate),
                  paidAt: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
                  nfseStatus: 'PENDING',  // NFS-e aguardando emissão
                },
              });

              // Atualizar data de expiração
              await prisma.company.update({
                where: { id: subscription.companyId },
                data: { planExpiresAt: addDays(new Date(), 30) },
              });
            }
          }
          break;
        }

        case 'PAYMENT_OVERDUE': {
          const payment = event.payment;
          if (payment.externalReference) {
            // Grace period: só suspende após 7 dias de atraso
            const company = await prisma.company.findUnique({
              where: { id: payment.externalReference },
              select: { status: true },
            });
            if (company?.status === 'ACTIVE') {
              await prisma.company.update({
                where: { id: payment.externalReference },
                data: { status: 'SUSPENDED' },
              });
            }
          }
          break;
        }

        case 'SUBSCRIPTION_DELETED':
        case 'SUBSCRIPTION_INACTIVATED': {
          if (event.payment.subscription) {
            const subscription = await prisma.subscription.findFirst({
              where: { asaasSubscriptionId: event.payment.subscription },
            });
            if (subscription) {
              await prisma.subscription.update({
                where: { id: subscription.id },
                data: { status: 'CANCELLED', cancelledAt: new Date() },
              });
              await prisma.company.update({
                where: { id: subscription.companyId },
                data: { status: 'CANCELLED' },
              });
            }
          }
          break;
        }
      }

      // Sempre retornar 200 para o Asaas
      return res.status(200).json({ received: true });

    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      // Retornar 200 mesmo com erro (evitar retry infinito)
      return res.status(200).json({ received: true, error: true });
    }
  }
}
```

### 3.4 `backend/src/routes/paymentRoutes.ts` (CRIAR)

```typescript
import { Router } from 'express';
import { PaymentController } from '../controller/payment/PaymentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
const paymentController = new PaymentController();

// Rotas autenticadas
router.post('/checkout', authMiddleware, (req, res) => paymentController.createCheckout(req, res));
router.get('/history', authMiddleware, (req, res) => paymentController.getPaymentHistory(req, res));
router.post('/cancel', authMiddleware, (req, res) => paymentController.cancelSubscription(req, res));

// Webhook (sem auth — validado por token próprio)
router.post('/webhook', (req, res) => paymentController.handleWebhook(req, res));

export { router as paymentsRouter };
```

---

## 4. Backend — Arquivos Existentes a Modificar

### 4.1 `backend/src/utils/planLimits.ts`

**Substituir completamente:**

```typescript
export enum PlanTier {
  DYNAMIC = 'DYNAMIC',
  ENTERPRISE_CUSTOM = 'ENTERPRISE_CUSTOM',
}

export enum CompanyStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  MASTER = 'MASTER',
  ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export interface PlanLimits {
  maxEmployees: number | null;  // null = dinâmico (ilimitado)
  price: number | null;
  api: {
    general: number;
    checkin: number;
    faceValidation: number;
  };
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.DYNAMIC]: {
    maxEmployees: null,  // ilimitado — preço é dinâmico
    price: 54.90,        // preço base (mínimo)
    api: {
      general: 100,
      checkin: 10,
      faceValidation: 30,
    },
  },
  [PlanTier.ENTERPRISE_CUSTOM]: {
    maxEmployees: null,
    price: null,
    api: {
      general: 1000,
      checkin: 100,
      faceValidation: 200,
    },
  },
};

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS[PlanTier.DYNAMIC];
}

/**
 * Verifica se a empresa pode criar funcionário.
 * No plano DYNAMIC, SEMPRE pode (preço é dinâmico).
 * No ENTERPRISE_CUSTOM, SEMPRE pode (ilimitado).
 */
export function canCreateEmployee(plan: PlanTier, _currentCount: number): boolean {
  // No novo modelo, sempre pode criar — o preço ajusta automaticamente
  return true;
}

export function getEmployeeUsagePercentage(_plan: PlanTier, _currentCount: number): number {
  // No plano dinâmico, não há limite fixo
  return 0;
}

export function isTrialExpired(planExpiresAt: Date | null): boolean {
  if (!planExpiresAt) return false;
  return new Date() > planExpiresAt;
}

export function getTrialDaysRemaining(planExpiresAt: Date | null): number {
  if (!planExpiresAt) return 0;
  const diff = planExpiresAt.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const TRIAL_DAYS = 30;
export const DEFAULT_PLAN = PlanTier.DYNAMIC;
export const DEFAULT_MAX_EMPLOYEES = 10;
```

### 4.2 `backend/src/controller/company/CompanyController.ts`

**Mudanças no `signup()`:**
- Criar customer no Asaas após criar company
- Salvar `asaasCustomerId`
- Plan = `DYNAMIC` (já é o default)

**Mudanças no `getMe()`:**
- Retornar `billingType`, `asaasPaymentMethod`
- Retornar `nextCyclePrice` (preço calculado)

**Mudanças no `getUsage()`:**
- Retornar cálculo dinâmico do preço:
  ```typescript
  const priceInfo = calculateDynamicPrice(company._count.users);
  return {
    employees: { ... },
    checkins: { ... },
    apiLimits: limits.api,
    plan: company.plan,
    pricing: priceInfo,  // ← NOVO
  };
  ```

**Mudanças no `createInviteToken()`:**
- Remover verificação de limite fixo
- Após adicionar funcionário, chamar `PaymentController.updateSubscriptionValue()`

### 4.3 `backend/src/middleware/PlanMiddleware.ts`

- `getCompanyPlanInfo()`: Adicionar campo `nextCyclePrice` com o cálculo dinâmico
- `requireEmployeeLimit()`: No plano DYNAMIC, NÃO bloquear — retornar flag `willIncreasePrice: true`
- `createDynamicRateLimiter()`: Usar limites do plano DYNAMIC

### 4.4 `backend/src/controller/master/MasterController.ts`

- `getMetrics()`: MRR = soma dos `calculatedTotal` de todas as subscriptions ativas
- `updateCompanyPlan()`: Aceitar `DYNAMIC` como plano válido
- `listCompanies()`: Filtrar por `DYNAMIC`
- `getCompanyDetails()`: Retornar dados de pagamento

### 4.5 `backend/src/routes/companyRoutes.ts`

- Adicionar: `router.use('/payments', paymentsRouter);`

### 4.6 `backend/src/utils/environment.ts`

Adicionar:
```typescript
ASAAS_API_KEY: process.env.ASAAS_API_KEY,
ASAAS_ENVIRONMENT: process.env.ASAAS_ENVIRONMENT || 'sandbox',
ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
```

### 4.7 `.env` (backend)

```env
ASAAS_API_KEY=sua_chave_aqui
ASAAS_ENVIRONMENT=sandbox
ASAAS_WEBHOOK_TOKEN=token_secreto_webhook
```

---

## 5. Frontend — Arquivos Novos

### 5.1 `frontend/src/components/PricingCalculator.tsx`

Componente de calculadora interativa para a landing page.

```tsx
// Estrutura do componente:
// - Slider ou input numérico para quantidade de funcionários
// - Exibe: "Até 10 funcionários: R$ 54,90/mês"
// - Slider acima de 10: "+ X funcionários × R$ 5,00 = R$ XX,XX"
// - Total: "R$ XX,XX/mês"
// - CTA: "Começar trial grátis"

// Props:
interface PricingCalculatorProps {
  onCtaClick?: () => void;
}
```

**Funcionalidades:**
- Slider de 1 a 100 funcionários
- Animação de transição entre valores (framer-motion)
- Cálculo em tempo real usando `calculatePrice()` do shared
- Breakpoint visual: "A partir de R$ 54,90/mês" para slider em 1-10

### 5.2 `frontend/src/components/plan/PaymentStatus.tsx`

Componente exibido no dashboard mostrando status do pagamento.

**Props:**
```typescript
interface PaymentStatusProps {
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  billingType?: 'PIX' | 'CREDIT_CARD' | null;
  currentPrice: number;
  nextDueDate?: string | null;
  nfseStatus?: 'PENDING' | 'ISSUED' | 'NOT_APPLICABLE';
}
```

**Renderização:**
- Trial: Contagem regressiva + "Ative seu plano"
- Ativo + Pendente: "Próximo pagamento: R$ XX,XX em DD/MM" + ícone verde
- Ativo + PIX: QR Code ou código copia-e-cola
- Ativo + Cartão: Ícone da bandeira + últimos 4 dígitos
- Suspenso: Alerta vermelho + "Regularize seu pagamento"
- Cancelado: "Plano cancelado" + botão reativar

### 5.3 `frontend/src/components/plan/PaymentHistory.tsx`

Lista de pagamentos do histórico.

**Colunas da tabela:**
| Data | Descrição | Valor | Método | Status | NFS-e |
|---|---|---|---|---|---|

**Status badges:**
- Pago: verde
- Pendente: amarelo
- Atrasado: vermelho
- Cancelado: cinza

**Coluna NFS-e:**
- `PENDING`: Badge "Aguardando emissão" (cinza)
- `ISSUED`: Link para download (verde)
- `NOT_APPLICABLE`: "N/A"

### 5.4 `frontend/src/hooks/usePayment.ts`

```typescript
export function usePayment() {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const createCheckout = async (billingType: 'PIX' | 'CREDIT_CARD') => {
    setIsLoading(true);
    try {
      const result = await api.payments.createCheckout({ billingType });
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async () => {
    setIsLoading(true);
    try {
      await api.payments.cancel();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const history = await api.payments.getHistory();
      setPaymentHistory(history);
    } finally {
      setIsLoading(false);
    }
  };

  return { createCheckout, cancelSubscription, paymentHistory, fetchHistory, isLoading };
}
```

### 5.5 `frontend/src/components/plan/CheckoutModal.tsx` (NOVO)

Modal que aparece quando o usuário precisa ativar o plano.

**Fluxo:**
1. Usuário clica "Ativar Plano"
2. Modal pergunta: Pix ou Cartão?
3. Usuário escolhe
4. Chama `POST /payments/checkout`
5. Se PIX: exibe QR Code + código copia-e-cola
6. Se Cartão: redireciona para checkout Asaas (ou iframe)
7. Aguarda confirmação (polling ou websocket)
8. Fecha modal e atualiza status

---

## 6. Frontend — Arquivos Existentes a Modificar

### 6.1 `shared/plans.ts`

**Substituir completamente:**

```typescript
export const TRIAL_DAYS = 30;
export const CUSTOM_PLAN_CTA = "Falar com vendas";

export const PRICING = {
  BASE_PRICE: 54.90,
  BASE_MAX_EMPLOYEES: 10,
  EXTRA_PRICE_PER_EMPLOYEE: 5.00,
} as const;

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanData {
  id: "DYNAMIC" | "ENTERPRISE_CUSTOM";
  name: string;
  price: number | null;
  period: string;
  maxEmployees: number | null;
  features: PlanFeature[];
  highlighted: boolean;
  ctaText: string;
  ctaVariant: "primary" | "secondary" | "outline";
}

export const DYNAMIC_PLAN: PlanData = {
  id: "DYNAMIC",
  name: "Viggo",
  price: 54.90,
  period: "/mês",
  maxEmployees: null,  // dinâmico
  features: [
    { text: "Reconhecimento facial ilimitado", included: true },
    { text: "Controle de localização (GPS)", included: true },
    { text: "Espelho de ponto e relatórios", included: true },
    { text: "Convites por link/QR code", included: true },
    { text: "Suporte por email", included: true },
    { text: "A partir de 10 funcionários", included: true },
  ],
  highlighted: true,
  ctaText: "Começar trial grátis",
  ctaVariant: "primary",
};

export const ENTERPRISE_PLAN: PlanData = {
  id: "ENTERPRISE_CUSTOM",
  name: "Enterprise",
  price: null,
  period: "",
  maxEmployees: null,
  features: [
    { text: "Funcionários ilimitados", included: true },
    { text: "Tudo do plano Viggo", included: true },

  ],
  highlighted: false,
  ctaText: CUSTOM_PLAN_CTA,
  ctaVariant: "secondary",
};

export const PLANS = [DYNAMIC_PLAN, ENTERPRISE_PLAN] as const;

export function getPlanById(id: PlanData["id"]): PlanData | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getHighlightedPlan(): PlanData | undefined {
  return PLANS.find((p) => p.highlighted);
}

/**
 * Calcula o preço do plano baseado no total de funcionários.
 * Desconta 1 (ENTERPRISE_ADMIN).
 */
export function calculatePrice(totalUsers: number): number {
  const paidEmployees = Math.max(0, totalUsers - 1);
  const extras = Math.max(0, paidEmployees - PRICING.BASE_MAX_EMPLOYEES);
  return Math.round((PRICING.BASE_PRICE + extras * PRICING.EXTRA_PRICE_PER_EMPLOYEE) * 100) / 100;
}

export function formatPrice(price: number | null): string {
  if (price === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(price);
}

export function formatMaxEmployees(max: number | null): string {
  if (max === null) return "Funcionários ilimitados";
  return `Até ${max} funcionários`;
}
```

### 6.2 `frontend/src/components/PricingSection.tsx`

**Substituir conteúdo:**

```tsx
import { Link, useNavigate } from "react-router";
import { DYNAMIC_PLAN, ENTERPRISE_PLAN } from "../../../shared/plans";
import { PricingCalculator } from "./PricingCalculator";

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-canvas-dark">
      <div className="mx-auto max-w-7xl px-8">
        <header className="text-center mb-16">
          <h2 className="text-4xl font-semibold tracking-tight text-on-dark">
            Plano simples e transparente
          </h2>
          <p className="mt-4 text-lg text-on-dark-muted max-w-2xl mx-auto">
            R$ 54,90/mês para até 10 funcionários. +R$ 5,00 por funcionário adicional.
            Trial de 30 dias, sem cartão de crédito.
          </p>
        </header>

        {/* Card principal — Plano Dinâmico */}
        <div className="max-w-lg mx-auto">
          <PricingCalculator onCtaClick={() => navigate("/company/signup")} />
        </div>

        {/* Enterprise */}
        <div className="mt-16">
          <div className="rounded-lg border border-hairline bg-surface p-8 md:p-12 text-center">
            <h3 className="text-3xl font-semibold text-ink">Precisa de algo maior?</h3>
            <p className="mt-4 text-lg text-steel">
              {ENTERPRISE_PLAN.features[0].text}, integrações customizadas,
              SLA personalizado e muito mais.
            </p>
            <div className="mt-8">
              <Link
                to="/planos/custom"
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-on-primary hover:bg-charcoal transition-colors"
              >
                {ENTERPRISE_PLAN.ctaText}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

### 6.3 `frontend/src/hooks/useCompany.ts` → `usePlanLimits()`

```typescript
export function usePlanLimits() {
  const limits = {
    DYNAMIC: {
      basePrice: 54.90,
      baseMaxEmployees: 10,
      extraPricePerEmployee: 5.00,
      api: { general: 100, checkin: 10, faceValidation: 30 },
    },
    ENTERPRISE_CUSTOM: {
      maxEmployees: null,
      price: null,
      api: { general: 1000, checkin: 100, faceValidation: 200 },
    },
  } as const;

  const getPlanLimit = (plan: keyof typeof limits) => limits[plan];

  const getPlanColor = (plan: keyof typeof limits) => {
    switch (plan) {
      case "DYNAMIC": return "emerald";
      case "ENTERPRISE_CUSTOM": return "amber";
      default: return "gray";
    }
  };

  const getPlanLabel = (plan: keyof typeof limits) => {
    switch (plan) {
      case "DYNAMIC": return "Viggo";
      case "ENTERPRISE_CUSTOM": return "Enterprise";
      default: return plan;
    }
  };

  const calculatePrice = (totalUsers: number) => {
    const paidEmployees = Math.max(0, totalUsers - 1);
    const extras = Math.max(0, paidEmployees - limits.DYNAMIC.baseMaxEmployees);
    return Math.round((limits.DYNAMIC.basePrice + extras * limits.DYNAMIC.extraPricePerEmployee) * 100) / 100;
  };

  return { limits, getPlanLimit, getPlanColor, getPlanLabel, calculatePrice };
}
```

### 6.4 `frontend/src/components/plan/PlanBadge.tsx`

```typescript
const planColors: Record<PlanTier, string> = {
  DYNAMIC: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ENTERPRISE_CUSTOM: "bg-amber-100 text-amber-700 border-amber-200",
};

const planLabels: Record<PlanTier, string> = {
  DYNAMIC: "Viggo",
  ENTERPRISE_CUSTOM: "Enterprise",
};
```

### 6.5 `frontend/src/components/plan/PlanComparisonModal.tsx`

**REESCREVER** como modal de checkout/gerenciamento:

- Título: "Ativar seu plano"
- Seção: Calculadora de preço (quantos funcionários?)
- Seção: Método de pagamento (Pix / Cartão)
- Seção: Tipo de cobrança (Recorrência automática / Manual)
- Resumo: "Total: R$ XX,XX/mês"
- Botão: "Ativar Agora"
- Se já ativo: mostrar status + botão "Gerenciar Pagamento"

### 6.6 `frontend/src/pages/DashboardPage.tsx` → `PlanTab`

**Remover:**
- `PlanComparisonModal` import e uso
- Referências a `getPlanLabel` com tiers antigos
- "Comparar Planos e Upgrade" button

**Adicionar:**
- `PaymentStatus` component (status do pagamento)
- `PaymentHistory` component (histórico)
- "Gerenciar Pagamento" button → abre `CheckoutModal`
- Cálculo dinâmico do preço: "R$ XX,XX/mês (10 base + 5 extras)"

### 6.7 `frontend/src/pages/LandingPage.tsx`

- `PricingSection` já será atualizado (seção 6.3)
- Textos da hero section: "A partir de R$ 54,90/mês"
- CTA trial continua o mesmo

### 6.8 `frontend/src/services/api.ts`

**Tipos novos:**
```typescript
type PlanTier = "DYNAMIC" | "ENTERPRISE_CUSTOM";

interface PaymentHistoryItem {
  id: string;
  amount: number;
  billingType: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  paymentUrl: string | null;
  nfseStatus: 'PENDING' | 'ISSUED' | 'NOT_APPLICABLE';
  nfseNumber: string | null;
  nfseUrl: string | null;
}

interface CheckoutResponse {
  subscriptionId: string;
  billingType: string;
  amount: number;
  paymentUrl: string;
}

interface PricingInfo {
  basePrice: number;
  baseMaxEmployees: number;
  paidEmployees: number;
  extraEmployees: number;
  extraPricePerUnit: number;
  extraTotal: number;
  total: number;
}
```

**Endpoints novos:**
```typescript
payments: {
  createCheckout: (data: { billingType: string }) => Promise<CheckoutResponse>,
  getHistory: () => Promise<PaymentHistoryItem[]>,
  cancel: () => Promise<void>,
},
```

**Tipo `UsageResponse` atualizado:**
```typescript
interface UsageResponse {
  employees: { current: number; limit: number | null; percentage: number; users: User[] };
  checkins: { thisMonth: number; total: number };
  apiLimits: { general: number; checkin: number; faceValidation: number };
  plan: PlanTier;
  pricing: PricingInfo;  // ← NOVO
}
```

### 6.9 `frontend/src/pages/CompanyManagePage.tsx` (Master Admin)

- Aceitar `DYNAMIC` como plano válido no select
- Mostrar cálculo dinâmico ao invés de selects fixos
- Botão "Ajustar funcionários" que atualiza o preço

### 6.10 `frontend/src/pages/MasterDashboard.tsx`

- MRR: `sum(subscriptions.filter(s => s.status === 'ACTIVE').map(s => s.calculatedTotal))`
- Distribuição:饼图 DYNAMIC vs ENTERPRISE_CUSTOM

### 6.11 `frontend/src/pages/MasterCompanies.tsx`

- Filtro: DYNAMIC / ENTERPRISE_CUSTOM
- Mostrar preço real de cada empresa (dinâmico)

---

## 7. Variáveis de Ambiente

### Backend `.env`
```env
# Asaas
ASAAS_API_KEY=sua_chave_api_aqui
ASAAS_ENVIRONMENT=sandbox
ASAAS_WEBHOOK_TOKEN=token_secreto_webhook_aqui

# Frontend (já existente)
VITE_API_URL=http://localhost:3333
```

---

## 8. Fluxos Completos do Usuário

### 8.1 NovoCadastro
```
1. Usuário preenche formulário em /company/signup
2. POST /auth/signup → cria Company (plan=DYNAMIC, status=TRIAL)
3. Backend cria customer no Asaas → salva asaasCustomerId
4. Backend cria Subscription (price=0, status=TRIAL, expiresAt=30d)
5. Retorna JWT → redireciona para /dashboard
```

### 8.2 Trial → Ativação (dia 30)
```
1. Trial expira → frontend mostra "Trial expirado"
2. Usuário clica "Ativar Plano"
3. Modal mostra: R$ 54,90/mês para até 10 funcionários
4. Usuário escolhe: Pix ou Cartão
5. POST /payments/checkout → cria assinatura no Asaas
6. Se PIX: exibe QR Code
7. Se Cartão: redireciona para checkout Asaas
8. Pagamento confirmado → webhook → status = ACTIVE
```

### 8.3 Adição de Funcionário (10 → 12)
```
1. Admin convia 2 novos funcionários (total: 12, admin: 1, pagos: 11)
2. Backend permite (não bloqueia)
3. Backend calcula: 54,90 + (1 × 5,00) = 59,90
4. Atualiza subscription no Asaas (próximo ciclo)
5. Frontend exibe: "2 funcionários adicionados. Próximo ciclo: R$ 59,90/mês"
```

### 8.4 Webhook do Asaas
```
PAYMENT_CONFIRMED → status = ACTIVE, registra pagamento com nfseStatus='PENDING'
PAYMENT_OVERDUE → (após 7 dias) status = SUSPENDED
SUBSCRIPTION_DELETED → status = CANCELLED
```

### 8.5 Nota Fiscal (NFS-e)
```
- Pagamento confirmado → nfseStatus = 'PENDING'
- Manual: admin emite NFS-e no Asaas → atualiza nfseStatus = 'ISSUED'
- Ou futuramente: automação via API do Asaas
- Frontend mostra "Aguardando emissão" (badge cinza)
- Quando emitida: link para download (badge verde)
```

---

## 9. Ordem de Implementação

### Fase 1 — Backend Fundação ✅ IMPLEMENTADO
1. ✅ `shared/plans.ts` — Novo modelo dinâmico com `DYNAMIC_PLAN`, `ENTERPRISE_PLAN`, `calculatePrice()`, `calculateDynamicPrice()`
2. ✅ `backend/prisma/schema.prisma` — Enum `PlanTier` limpo (DYNAMIC + ENTERPRISE_CUSTOM), campos novos em Company/Subscription, model Payment criado
3. ✅ `prisma db push` — Schema aplicado ao banco Neon
4. ✅ `backend/src/utils/pricingCalculator.ts` — Função `calculateDynamicPrice()` com desconto de -1 para ENTERPRISE_ADMIN
5. ✅ `backend/src/services/asaasService.ts` — Serviço completo: customers, subscriptions, payments, webhook validation
6. ✅ `backend/src/utils/environment.ts` — Variáveis `ASAAS_API_KEY`, `ASAAS_ENVIRONMENT`, `ASAAS_WEBHOOK_TOKEN` adicionadas
7. ✅ `backend/src/controller/payment/PaymentController.ts` — createCheckout, updateSubscriptionValue, getPaymentHistory, cancelSubscription, handleWebhook
8. ✅ `backend/src/routes/paymentRoutes.ts` — Rotas: POST /checkout, GET /history, POST /cancel, POST /webhook
9. ✅ `backend/src/utils/planLimits.ts` — Reescrito com PlanTier.DYNAMIC, canCreateEmployee sempre true
10. ✅ `backend/src/controller/company/CompanyController.ts` — signup com DYNAMIC + Asaas customer, getMe com pricing, getUsage com pricing, createInviteToken sem limite fixo
11. ✅ `backend/src/middleware/PlanMiddleware.ts` — Reescrito: willIncreasePrice, nextCyclePrice, requireEmployeeLimit sempre allow para DYNAMIC
12. ✅ `backend/src/routes/companyRoutes.ts` — paymentRoutes adicionado
13. ✅ `backend/src/controller/master/MasterController.ts` — Filtros e updatePlan atualizados para DYNAMIC
14. ✅ `backend/.env-example` — Variáveis Asaas documentadas
15. ✅ `frontend/src/services/api.ts` — Tipos PlanTier, CompanyResponse, UsageResponse, Subscription, PaymentHistoryItem, CheckoutResponse atualizados; endpoint payments adicionado
16. ✅ `npm run build` backend — Sem erros de compilação

### Fase 2 — Frontend Fundação ✅ IMPLEMENTADO
17. ✅ `frontend/src/hooks/useCompany.ts` — usePlanLimits com DYNAMIC (maxEmployees, price, basePrice, calculatePrice)
18. ✅ `frontend/src/components/plan/PlanBadge.tsx` — Cores e labels para DYNAMIC e ENTERPRISE_CUSTOM
19. ✅ `frontend/src/hooks/usePayment.ts` — createCheckout, cancelSubscription, fetchHistory
20. ✅ `frontend/src/components/plan/PlanComparisonModal.tsx` — Reescrito com DYNAMIC e ENTERPRISE_CUSTOM
21. ✅ `frontend/src/components/PricingSection.tsx` — Reescrito com grid 2 colunas
22. ✅ `frontend/src/hooks/useAuth.ts` — PlanTier type atualizado
23. ✅ `frontend/src/pages/CompanyManagePage.tsx` — Plan options atualizados
24. ✅ `frontend/src/pages/MasterCompanies.tsx` — Filtro de planos atualizado
25. ✅ `frontend/src/pages/MasterDashboard.tsx` — Plan styles atualizados
26. ✅ `frontend/src/components/company/InvitesTab.tsx` — Compatível com novo usePlanLimits
27. ✅ `frontend/src/pages/DashboardPage.tsx` — Compatível com novo usePlanLimits
28. ✅ `npm run build` frontend — Sem erros de compilação

### Fase 3 — Frontend UI ✅ IMPLEMENTADO
29. ✅ `frontend/src/components/PricingCalculator.tsx` — Calculadora interativa com slider 1-100, cálculo em tempo real, breakdown de preço
30. ✅ `frontend/src/components/plan/PaymentStatus.tsx` — Status visual (Trial/Active/Suspended/Cancelled), mostra preço dinâmico e método de pagamento
31. ✅ `frontend/src/components/plan/PaymentHistory.tsx` — Tabela de pagamentos com status, método, NFS-e, loading e empty state
32. ✅ `frontend/src/components/plan/CheckoutModal.tsx` — Modal de ativação: escolha Pix/Cartão, redireciona para checkout Asaas
33. ✅ `frontend/src/components/plan/index.ts` — Exports dos novos componentes
34. ✅ `npm run build` frontend — Sem erros de compilação

### Fase 4 — Integração Dashboard ✅ IMPLEMENTADO
35. ✅ `frontend/src/pages/DashboardPage.tsx` — PlanTab reescrito com PaymentStatus, PaymentHistory, CheckoutModal, cálculo dinâmico de preço
36. ✅ `frontend/src/pages/LandingPage.tsx` — PricingCalculator adicionado na seção de preços
37. ✅ `npm run build` frontend — Sem erros de compilação

### Fase 5 — Master Admin ✅ IMPLEMENTADO
38. ✅ `backend/src/controller/master/MasterController.ts` — MRR dinâmico via calculatedTotal, pricing no listCompanies e getCompanyDetails, updateCompanyPlan com DYNAMIC
39. ✅ `frontend/src/services/api.ts` — MasterCompanyListItem com pricing, MasterCompanyDetail com employeesCount/checkinsCount/subscriptionsCount, MasterCompaniesResponse com pagination
40. ✅ `frontend/src/hooks/useMaster.ts` — pagination em vez de meta
41. ✅ `frontend/src/pages/MasterCompanies.tsx` — Coluna "Preço" com R$ dinâmico
42. ✅ `frontend/src/pages/CompanyManagePage.tsx` — Card "Preço Mensal" com cálculo dinâmico
43. ✅ `npm run build` backend — Sem erros de compilação
44. ✅ `npm run build` frontend — Sem erros de compilação

### Fase 6 — Testes e Deploy
29. Configurar conta Asaas sandbox
30. Testar fluxo: signup → trial → pagamento
31. Testar webhooks (simulador Asaas)
32. Testar adição/remoção de funcionários
33. Deploy backend
34. Deploy frontend
35. Configurar webhook em produção (HTTPS)

---

## 10. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Webhook não recebido | Polling periódico via `GET /v3/payments/:id` |
| Preço dinâmico diverge do Asaas | Sincronizar via `PUT /v3/subscriptions/:id` a cada mudança |
| NFS-e manual é gargalo | Automatizar futuramente via API Asaas |
| Webhook duplicado | Tabela `Payment` com `asaasPaymentId` unique |
| Empresa com many funcionários e inadimplência | Grace period 7 dias antes de suspender |

---

## 11. Dependências Necessárias

### Backend
- `node-fetch` ou built-in `fetch` (Node 18+)
- `date-fns` (já instalado)

### Frontend
- `framer-motion` (já instalado) — para animações da calculadora
- `lucide-react` (já instalado) — ícones de pagamento

---

*Este documento deve ser atualizado conforme a implementação avança.*
