import { DATABASE_URL_MISSING_ERROR } from "@/src/lib/prisma";

const PRISMA_SETUP_ERROR_CODES = new Set([
  "P1000",
  "P1001",
  "P1003",
  "P1010",
  "P1011",
  "P2021",
  "P2022",
]);

const PRISMA_SETUP_ERROR_PATTERNS = [
  /does not exist/i,
  /relation .* does not exist/i,
  /table .* does not exist/i,
  /can't reach database server/i,
  /database .* does not exist/i,
  /no such table/i,
];

function getErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const value = (error as { code?: unknown }).code;
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function getPrismaSetupErrorMessage(error: unknown): string | null {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  if (message.includes(DATABASE_URL_MISSING_ERROR)) {
    return message;
  }

  if (code && PRISMA_SETUP_ERROR_CODES.has(code)) {
    return `${code}: ${message}`;
  }

  if (PRISMA_SETUP_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return message;
  }

  return null;
}
