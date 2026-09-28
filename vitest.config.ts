import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["./tests/unit/setup.ts"],
    // The database-backed tests walk whole flows — submit, approve, log in,
    // change a password — and each step is a round trip. Against a local
    // Postgres that is milliseconds and the 5s default is ample; against a
    // hosted branch it is not, and every one of them timed out halfway
    // through, leaving rows behind because the cleanup never ran. The tests
    // that don't touch a database are unaffected: a timeout only costs
    // anything when it is reached.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/unit/server-only-stub.ts"),
    },
  },
});
