// app/lib/prisma.ts
//
// A single, shared Prisma client for the whole app.
//
// Why a singleton? In development, Next.js hot-reloads modules on every file
// save. If we created `new PrismaClient()` each time, every reload would open a
// new pool of database connections and soon exhaust the limit. So we cache ONE
// client on the global object and reuse it across reloads.

import { PrismaClient } from "@prisma/client";

// `globalThis` persists across hot reloads (a normal module-level variable does not).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse the cached client if it exists, otherwise create one.
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// In production we don't hot-reload, so we don't need to cache it globally.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
