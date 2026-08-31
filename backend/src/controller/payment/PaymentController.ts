import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { z } from 'zod';
import * as asaasService from '../../services/asaasService.js';
import { calculateDynamicPrice } from '../../utils/pricingCalculator.js';
import { addDays, format } from 'date-fns';
import * as emailService from '../../services/email/emailService.js';
import { Env } from '../../utils/environment.js';

function isMasterCnpj(cnpj: string | null | undefined): boolean {
  const master = Env.MASTER_CNPJ?.replace(/\D/g, '');
  if (!master || !cnpj) return false;
  return cnpj.replace(/\D/g, '') === master;
}

export class PaymentController {

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

      if (isMasterCnpj(company.cnpj)) {
        return res.status(200).json({ free: true, message: 'Empresa master isenta de cobrança' });
      }

      let customerId = company.asaasCustomerId;
      if (!customerId) {
        // Buscar email do admin da empresa para criar customer
        const adminUser = await prisma.user.findFirst({
          where: { companyId, role: 'ENTERPRISE_ADMIN' },
          select: { email: true },
        });
        const customer = await asaasService.createCustomer({
          name: company.name,
          cpfCnpj: company.cnpj,
          email: adminUser?.email || '',
        });
        customerId = customer.id;
        await prisma.company.update({
          where: { id: companyId },
          data: { asaasCustomerId: customerId },
        });
      }

      const priceInfo = calculateDynamicPrice(company._count.users);

      const subscription = await asaasService.createSubscription({
        customerId,
        billingType,
        value: priceInfo.total,
        description: `Viggo - Plano ${priceInfo.paidEmployees} funcionários`,
        externalReference: companyId,
        nextDueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      });

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

  async updateSubscriptionValue(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        cnpj: true,
        asaasCustomerId: true,
        _count: { select: { users: true } },
      },
    });

    if (!company) return;
    if (isMasterCnpj(company.cnpj)) return;

    const activeSubscription = await prisma.subscription.findFirst({
      where: { companyId, status: 'ACTIVE', billingType: 'RECURRENT' },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSubscription?.asaasSubscriptionId) return;

    const priceInfo = calculateDynamicPrice(company._count.users);

    await asaasService.updateSubscription(activeSubscription.asaasSubscriptionId, {
      value: priceInfo.total,
    });

    await prisma.subscription.update({
      where: { id: activeSubscription.id },
      data: {
        extraEmployees: priceInfo.extraEmployees,
        calculatedTotal: priceInfo.total,
        price: priceInfo.total,
      },
    });
  }

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

      // Fallback: se ?sync=true e empresa tem asaasCustomerId, tenta buscar no Asaas para reconciliação
      const sync = (req.query as unknown as Record<string, unknown>)?.sync === 'true';
      if (sync) {
        try {
          const company = await prisma.company.findUnique({ where: { id: companyId }, select: { asaasCustomerId: true } });
          if (company?.asaasCustomerId) {
            const asaasPayments = await asaasService.getPaymentsByCustomer(company.asaasCustomerId, 50) as { data?: Array<{ id: string; value: number; billingType: string; status: string; dueDate: string; invoiceUrl?: string }> };
            // Não persiste, apenas retorna enriquecido para debug; webhook continua fonte da verdade
            if (asaasPayments?.data) {
              console.log(`[Asaas] fallback sync: ${asaasPayments.data.length} pagamentos no Asaas para ${companyId}`);
            }
          }
        } catch (e) {
          console.warn("[Asaas] fallback getPaymentsByCustomer falhou:", e instanceof Error ? e.message : String(e));
        }
      }

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
   * POST /companies/payments/retry
   * Cria pagamento avulso (createPayment) para retry de boleto/PIX vencido.
   * Útil quando PAYMENT_OVERDUE e cliente quer pagar sem cancelar assinatura.
   */
  async retryPayment(req: Request, res: Response) {
    const bodySchema = z.object({
      billingType: z.enum(['PIX', 'CREDIT_CARD', 'BOLETO']).default('PIX'),
    });
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ message: 'Empresa não identificada' });
      }

      const { billingType } = bodySchema.parse(req.body);

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, cnpj: true, asaasCustomerId: true, _count: { select: { users: true } } },
      });

      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      if (isMasterCnpj(company.cnpj)) {
        return res.status(200).json({ free: true, message: 'Empresa master isenta de cobrança' });
      }

      let customerId = company.asaasCustomerId;
      if (!customerId) {
        const adminUser = await prisma.user.findFirst({
          where: { companyId, role: 'ENTERPRISE_ADMIN' },
          select: { email: true },
        });
        const customer = await asaasService.createCustomer({
          name: company.name,
          cpfCnpj: company.cnpj,
          email: adminUser?.email || '',
        });
        customerId = customer.id;
        await prisma.company.update({ where: { id: companyId }, data: { asaasCustomerId: customerId } });
      }

      const priceInfo = calculateDynamicPrice(company._count.users);
      const dueDateStr = format(new Date(), 'yyyy-MM-dd');

      const payment = await asaasService.createPayment({
        customerId,
        billingType,
        value: priceInfo.total,
        dueDate: dueDateStr,
        description: `Viggo - Pagamento avulso retry - ${priceInfo.paidEmployees} funcionários`,
        externalReference: companyId,
      });

      // Persiste como PENDING local (webhook PAYMENT_CONFIRMED vai confirmar)
      await prisma.payment.create({
        data: {
          companyId,
          asaasPaymentId: (payment as { id?: string }).id || null,
          amount: priceInfo.total,
          billingType,
          status: 'PENDING',
          dueDate: new Date(dueDateStr),
          paymentUrl: (payment as { invoiceUrl?: string; paymentUrl?: string }).invoiceUrl || (payment as { paymentUrl?: string }).paymentUrl || null,
          invoiceUrl: (payment as { invoiceUrl?: string }).invoiceUrl || null,
        },
      });

      return res.json({
        paymentId: (payment as { id?: string }).id,
        amount: priceInfo.total,
        billingType,
        dueDate: dueDateStr,
        paymentUrl: (payment as { invoiceUrl?: string; paymentUrl?: string }).invoiceUrl || (payment as { paymentUrl?: string }).paymentUrl || null,
        invoiceUrl: (payment as { invoiceUrl?: string }).invoiceUrl || null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao criar pagamento avulso retry:', error);
      return res.status(500).json({ message: 'Erro ao criar pagamento avulso' });
    }
  }

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

      if (activeSubscription.asaasSubscriptionId) {
        await asaasService.cancelSubscription(activeSubscription.asaasSubscriptionId);
      }

      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });

      await prisma.company.update({
        where: { id: companyId },
        data: { status: 'CANCELLED' },
      });

      void (async () => {
        try {
          const admins = await prisma.user.findMany({ where: { companyId, role: "ENTERPRISE_ADMIN" }, select: { email: true } });
          if (admins.length > 0) {
            await emailService.sendSubscriptionCancelled({
              to: admins.map((a) => a.email),
              companyName: company?.name ?? "Sua empresa",
            });
          }
        } catch (err) {
          console.error("[Email] subscription-cancelled failed:", err);
        }
      })();

      return res.json({ message: 'Assinatura cancelada com sucesso' });

    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      return res.status(500).json({ message: 'Erro ao cancelar assinatura' });
    }
  }

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

          if (payment.externalReference) {
            const masterCheck = await prisma.company.findUnique({
              where: { id: payment.externalReference },
              select: { cnpj: true },
            });
            if (isMasterCnpj(masterCheck?.cnpj)) {
              break;
            }
            await prisma.company.update({
              where: { id: payment.externalReference },
              data: { status: 'ACTIVE' },
            });
          }

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
                  nfseStatus: 'PENDING',
                },
              });

              await prisma.company.update({
                where: { id: subscription.companyId },
                data: { planExpiresAt: addDays(new Date(), 30) },
              });

              // E-mail pagamento confirmado
              void (async () => {
                try {
                  const company = await prisma.company.findUnique({
                    where: { id: subscription.companyId },
                    select: { name: true },
                  });
                  const admins = await prisma.user.findMany({
                    where: { companyId: subscription.companyId, role: "ENTERPRISE_ADMIN" },
                    select: { email: true },
                  });
                  if (admins.length > 0) {
                    await emailService.sendPaymentConfirmed({
                      to: admins.map((a) => a.email),
                      companyName: company?.name ?? "Sua empresa",
                      amount: payment.value,
                      billingType: payment.billingType,
                      paidAt: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
                    });
                  }
                } catch (err) {
                  console.error("[Email] payment-confirmed failed:", err);
                }
              })();
            }
          }
          break;
        }

        case 'PAYMENT_OVERDUE': {
          const payment = event.payment;
          if (payment.externalReference) {
            const company = await prisma.company.findUnique({
              where: { id: payment.externalReference },
              select: { cnpj: true, status: true, name: true },
            });
            if (isMasterCnpj(company?.cnpj)) {
              break;
            }
            if (company?.status === 'ACTIVE') {
              await prisma.company.update({
                where: { id: payment.externalReference },
                data: { status: 'SUSPENDED' },
              });
            }
            // E-mail pagamento em atraso (mesmo se já estava suspensa, notifica)
            void (async () => {
              try {
                const admins = await prisma.user.findMany({
                  where: { companyId: payment.externalReference!, role: "ENTERPRISE_ADMIN" },
                  select: { email: true },
                });
                if (admins.length > 0) {
                  await emailService.sendPaymentOverdue({
                    to: admins.map((a) => a.email),
                    companyName: company?.name ?? "Sua empresa",
                    amount: payment.value,
                    dueDate: new Date(payment.dueDate),
                  });
                }
              } catch (err) {
                console.error("[Email] payment-overdue failed:", err);
              }
            })();
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
              const comp = await prisma.company.findUnique({ where: { id: subscription.companyId }, select: { cnpj: true } });
              if (isMasterCnpj(comp?.cnpj)) {
                break;
              }
              await prisma.subscription.update({
                where: { id: subscription.id },
                data: { status: 'CANCELLED', cancelledAt: new Date() },
              });
              await prisma.company.update({
                where: { id: subscription.companyId },
                data: { status: 'CANCELLED' },
              });
              void (async () => {
                try {
                  const company = await prisma.company.findUnique({ where: { id: subscription.companyId }, select: { name: true } });
                  const admins = await prisma.user.findMany({ where: { companyId: subscription.companyId, role: "ENTERPRISE_ADMIN" }, select: { email: true } });
                  if (admins.length > 0) {
                    await emailService.sendSubscriptionCancelled({
                      to: admins.map((a) => a.email),
                      companyName: company?.name ?? "Sua empresa",
                    });
                  }
                } catch (err) {
                  console.error("[Email] subscription-cancelled (webhook) failed:", err);
                }
              })();
            }
          }
          break;
        }
      }

      return res.status(200).json({ received: true });

    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return res.status(200).json({ received: true, error: true });
    }
  }
}
