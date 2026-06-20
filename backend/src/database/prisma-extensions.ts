import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma.js';

let currentCompanyId: string | null = null;
let currentUserId: string | null = null;

export function setCurrentCompanyId(companyId: string | null) {
  currentCompanyId = companyId;
}

export function getCurrentCompanyId(): string | null {
  return currentCompanyId;
}

export function setCurrentUserId(userId: string | null) {
  currentUserId = userId;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

const operationsWithWhere = ['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert', 'count', 'aggregate', 'groupBy'];
const operationsWithData = ['create', 'createMany', 'update', 'updateMany', 'upsert'];

export const extendedPrisma = prisma.$extends({
  name: 'multi-tenancy',
  query: {
    $allModels: {
      async $allOperations({ args, query, operation }) {
        const companyId = currentCompanyId;

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
  setCurrentCompanyId(companyId);
  setCurrentUserId(userId);
  return extendedPrisma;
}

export function clearPrismaContext() {
  currentCompanyId = null;
  currentUserId = null;
}