// "server-only" throws by design when imported outside the Next.js build
// pipeline, so Vitest (which runs standalone) needs a harmless stand-in.
// This file is never used by the actual Next.js app — only by tests.
export {};
