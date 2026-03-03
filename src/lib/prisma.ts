import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let productionPrisma: PrismaClient | undefined;

export const DATABASE_URL_MISSING_ERROR =
  "DATABASE_URL is missing. Add DATABASE_URL to .env or .env.local.";

function makePrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(DATABASE_URL_MISSING_ERROR);
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (process.env.NODE_ENV === "production") {
    if (!productionPrisma) {
      productionPrisma = makePrismaClient();
    }

    return productionPrisma;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = makePrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = getPrismaClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
});
