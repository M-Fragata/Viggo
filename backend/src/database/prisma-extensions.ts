import { AsyncLocalStorage } from 'node:async_hooks';
import { prisma } from './prisma.js';

interface PrismaContext {
  companyId: string;
  userId: string;
}

export const prismaContextStore = new AsyncLocalStorage<PrismaContext>();

export function getCurrentCompanyId(): string | undefined {
  return prismaContextStore.getStore()?.companyId;
}

export function getCurrentUserId(): string | undefined {
  return prismaContextStore.getStore()?.userId;
}

const operationsWithWhere = ['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert', 'count', 'aggregate', 'groupBy'];
const operationsWithData = ['create', 'createMany', 'update', 'updateMany', 'upsert'];

export const extendedPrisma = prisma.$extends({
  name: 'multi-tenancy',
  query: {
    $allModels: {
      async $allOperations({ args, query, operation }) {
        const store = prismaContextStore.getStore();
        const companyId = store?.companyId;

        if (companyId && operationsWithWhere.includes(operation)) {
          if (args && typeof args === 'object' && 'where' in args) {
            const typedArgs = args as Record<string, unknown>;
            if (typedArgs.where) {
              typedArgs.where = {
                ...(typedArgs.where as Record<string, unknown>),
                companyId,
              };
            } else {
              typedArgs.where = { companyId };
            }
          } else if (args) {
            (args as Record<string, unknown>).where = { companyId };
          }
        }

        if (companyId && operationsWithData.includes(operation)) {
          if (args && typeof args === 'object' && 'data' in args) {
            const typedArgs = args as Record<string, unknown>;
            if (typedArgs.data) {
              if (Array.isArray(typedArgs.data)) {
                typedArgs.data = (typedArgs.data as Record<string, unknown>[]).map(item => ({
                  ...item,
                  companyId,
                }));
              } else {
                typedArgs.data = {
                  ...(typedArgs.data as Record<string, unknown>),
                  companyId,
                };
              }
            }
          }
        }

        return query(args);
      },
    },
  },
});

export function createPrismaContext(companyId: string, userId: string) {
  return prismaContextStore.run({ companyId, userId }, () => extendedPrisma);
}