import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env, assertDatabaseConfigured } from '../config/env.js';

assertDatabaseConfigured();

// Prisma 6 "Rust-free" client talks to PostgreSQL through the pg driver adapter.
const adapter = new PrismaPg({ connectionString: env.databaseUrl });
export const prisma = new PrismaClient({ adapter });
export { Prisma };
