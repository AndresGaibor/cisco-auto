import { describe, expect, test } from "bun:test";
import { TokenBucketRateLimiter, SlidingWindowRateLimiter } from "../telemetry/rate-limiter.js";

describe("TokenBucketRateLimiter", () => {
  test("permite consumir hasta la capacidad inicial", () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 5, refillRate: 1 });
    expect(limiter.tryConsume().allowed).toBe(true);
    expect(limiter.tryConsume().allowed).toBe(true);
    expect(limiter.tryConsume().allowed).toBe(true);
    expect(limiter.tryConsume().allowed).toBe(true);
    expect(limiter.tryConsume().allowed).toBe(true);
  });

  test("rechaza cuando se excede la capacidad", () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillRate: 0.1 });
    expect(limiter.tryConsume().allowed).toBe(true);
    expect(limiter.tryConsume().allowed).toBe(true);
    const result = limiter.tryConsume();
    expect(result.allowed).toBe(false);
    expect(result.waitMs).toBeGreaterThan(0);
  });

  test("refill regenera tokens con el tiempo", async () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillRate: 10 });
    expect(limiter.tryConsume().allowed).toBe(true);
    expect(limiter.tryConsume().allowed).toBe(true);
    expect(limiter.tryConsume().allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 200));
    expect(limiter.tryConsume().allowed).toBe(true);
  });

  test("getStats reporta estado correcto", () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 5, refillRate: 2 });
    limiter.tryConsume();
    limiter.tryConsume();
    limiter.tryConsume();

    const stats = limiter.getStats();
    expect(stats.totalConsumed).toBe(3);
    expect(stats.capacity).toBe(5);
    expect(stats.refillRate).toBe(2);
  });

  test("acquire bloquea hasta tener tokens", async () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 1, refillRate: 20 });
    await limiter.acquire();
    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  test("reset restaura el bucket", () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 3, refillRate: 0.1 });
    limiter.tryConsume();
    limiter.tryConsume();
    limiter.tryConsume();
    expect(limiter.tryConsume().allowed).toBe(false);

    limiter.reset();
    expect(limiter.tryConsume().allowed).toBe(true);
  });
});

describe("SlidingWindowRateLimiter", () => {
  test("permite hasta maxEvents en la ventana", () => {
    const limiter = new SlidingWindowRateLimiter(3, 1000);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(false);
  });

  test("libera eventos después de la ventana", async () => {
    const limiter = new SlidingWindowRateLimiter(2, 100);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 150));
    expect(limiter.tryAcquire().allowed).toBe(true);
  });

  test("getStats expone métricas", () => {
    const limiter = new SlidingWindowRateLimiter(5, 1000);
    limiter.tryAcquire();
    limiter.tryAcquire();
    limiter.tryAcquire();

    const stats = limiter.getStats();
    expect(stats.eventsInWindow).toBe(3);
    expect(stats.maxEvents).toBe(5);
    expect(stats.totalAllowed).toBe(3);
  });

  test("retryAfterMs es correcto", async () => {
    const limiter = new SlidingWindowRateLimiter(1, 200);
    limiter.tryAcquire();
    const result = limiter.tryAcquire();
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(200);
  });
});
