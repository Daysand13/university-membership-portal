import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Vercel's serverless functions can spin up many separate instances under
// concurrent traffic, each running this module fresh. A plain TCP
// connection pool (@prisma/adapter-pg) opens a real Postgres connection per
// instance — under real concurrent load against Neon that exhausts its
// connection limit fast, which is exactly what an intermittent "server
// error" for "some users" while others succeed looks like: whoever hits an
// instance that couldn't get a connection fails, everyone else is fine.
//
// Neon's own serverless driver is built for exactly this (many short-lived
// serverless invocations) and is the officially recommended pairing for
// Vercel + Neon + Prisma — but it only speaks Neon's specific WebSocket
// proxy protocol, so it can't be used against a plain local/non-Neon
// Postgres instance (e.g. this project's own local test database). The
// choice below picks the right one automatically based on the actual
// connection target, so local development and CI keep working unchanged
// while production gets the fix.
neonConfig.webSocketConstructor = ws;

function isNeonConnection(connectionString: string): boolean {
  return connectionString.includes("neon.tech");
}

declare global {
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
  }

  if (isNeonConnection(connectionString)) {
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Reuse a single client across hot reloads in dev and across warm serverless
// invocations, instead of exhausting Postgres connections.
export const db: PrismaClient = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
