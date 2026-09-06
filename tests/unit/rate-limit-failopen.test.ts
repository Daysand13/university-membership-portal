import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulates the database being unreachable, which is the scenario that
// matters here: if the rate limiter can't do its job, it must let the
// request through rather than block a legitimate applicant. Failing closed
// would mean a brief database problem takes the whole membership form
// offline — worse than briefly not enforcing a limit.
vi.mock("@/lib/db", () => {
  const boom = () => Promise.reject(new Error("P1001: Can't reach database server"));
  return {
    db: {
      rateLimitAttempt: {
        count: boom,
        create: boom,
        deleteMany: boom,
      },
    },
  };
});

describe("checkRateLimit when the database is unavailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows the request through instead of blocking the person", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("enroll:ip:1.2.3.4", { max: 1, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
  });

  it("stays allowed even after repeated failing attempts", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit("enroll:ip:5.6.7.8", { max: 1, windowSeconds: 60 });
      expect(result.allowed).toBe(true);
    }
  });
});
