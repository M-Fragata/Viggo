import { Env } from "../utils/environment.js"
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '@prisma/client';

const connectionString = `${Env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };