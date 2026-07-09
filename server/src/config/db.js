import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 requires an explicit driver adapter to connect — the days of
// PrismaClient reading DATABASE_URL out of schema.prisma on its own are
// over. prisma.config.mjs (project root) covers the CLI/migration side of
// this same change; this is the runtime side, used by every controller via
// the shared `prisma` export below.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;
