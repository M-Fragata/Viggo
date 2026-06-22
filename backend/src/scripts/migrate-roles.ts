import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, PlanTier, CompanyStatus } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function migrateRoles() {
  console.log('Iniciando migração de roles...');

  try {
    // 1. Migrar ADMIN -> ENTERPRISE_ADMIN
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' as any },
    });

    console.log(`Encontrados ${adminUsers.length} usuários com role ADMIN`);

    for (const user of adminUsers) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.ENTERPRISE_ADMIN },
      });
      console.log(`  - Migrado usuário ${user.email} (${user.id}) para ENTERPRISE_ADMIN`);
    }

    // 2. Definir seu usuário como MASTER (ajuste o email conforme necessário)
    const masterEmail = process.env.MASTER_EMAIL || 'master@viggo.com';
    const masterUser = await prisma.user.findUnique({
      where: { email: masterEmail },
    });

    if (masterUser) {
      await prisma.user.update({
        where: { id: masterUser.id },
        data: { role: UserRole.MASTER, enterpriseId: null },
      });
      console.log(`Usuário master definido: ${masterUser.email} (${masterUser.id})`);
    } else {
      console.log(`AVISO: Usuário master não encontrado com email ${masterEmail}`);
      console.log('Defina MASTER_EMAIL no .env ou crie o usuário manualmente');
    }

    // 3. Atualizar empresas existentes para TRIAL com 30 dias
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { plan: { equals: PlanTier.TIER_I } },
          { status: { equals: CompanyStatus.TRIAL } },
        ],
      },
    });

    console.log(`Atualizando ${companies.length} empresas com dados padrão...`);

    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

    for (const company of companies) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          plan: PlanTier.TIER_I,
          status: CompanyStatus.TRIAL,
          maxEmployees: 10,
          planExpiresAt: trialExpiresAt,
          trialUsed: false,
        },
      });
      console.log(`  - Empresa ${company.name} (${company.id}) atualizada para TRIAL/TIER_I`);
    }

    // 4. Criar subscription inicial para empresas em TRIAL
    const trialCompanies = await prisma.company.findMany({
      where: { status: CompanyStatus.TRIAL },
    });

    for (const company of trialCompanies) {
      const existingSub = await prisma.subscription.findFirst({
        where: { companyId: company.id, status: 'TRIAL' },
      });

      if (!existingSub) {
        await prisma.subscription.create({
          data: {
            companyId: company.id,
            planTier: PlanTier.TIER_I,
            price: 0,
            status: 'TRIAL',
            startedAt: company.createdAt,
            expiresAt: trialExpiresAt,
          },
        });
        console.log(`  - Subscription TRIAL criada para empresa ${company.name}`);
      }
    }

    console.log('Migração concluída com sucesso!');

  } catch (error) {
    console.error('Erro na migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateRoles()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));