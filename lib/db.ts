import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (Deno.env.get("DENO_ENV") === "production") {
  prisma = new PrismaClient();
} else {
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient({
      log: ["query", "error", "warn"],
    });
  }
  prisma = globalThis.__prisma;
}

export { prisma };
