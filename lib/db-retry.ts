import { Prisma } from '@prisma/client';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1500;

function isConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1001') return true;
  return false;
}

/**
 * Wraps a cron job's entire body. Only retries when the failure is a
 * connection-level one — meaning no query the cron makes could have
 * partially succeeded, since the connection to the database never
 * actually opened. This is what makes blindly re-running the whole
 * cron body safe here, even for a cron that isn't otherwise built to
 * be re-run mid-way through (a P1001 means nothing ran at all yet).
 */
export async function withDbConnectionRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isConnectionError(err) || attempt === MAX_ATTEMPTS) throw err;
      console.warn(`Database connection attempt ${attempt} failed, retrying in ${BASE_DELAY_MS * attempt}ms...`);
      await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS * attempt));
    }
  }
  throw lastError;
}
