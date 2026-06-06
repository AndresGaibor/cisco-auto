import { describe, expect, test } from "bun:test";
import { RetryPolicy, MaxRetriesExceededError } from "../retry-policy.js";

describe("RetryPolicy", () => {
  describe("execute", () => {
    test("retorna resultado si la función tiene éxito al primer intento", async () => {
      const policy = new RetryPolicy({ maxRetries: 3 });
      const result = await policy.execute(async () => "ok");
      expect(result).toBe("ok");
    });

    test("reintenta hasta que la función tenga éxito", async () => {
      const policy = new RetryPolicy({ maxRetries: 5, baseDelayMs: 5 });
      let attempts = 0;

      const result = await policy.execute(async () => {
        attempts++;
        if (attempts < 3) throw new Error("not yet");
        return "ok";
      });

      expect(result).toBe("ok");
      expect(attempts).toBe(3);
    });

    test("lanza MaxRetriesExceededError tras agotar intentos", async () => {
      const policy = new RetryPolicy({ maxRetries: 3, baseDelayMs: 5 });
      let attempts = 0;

      try {
        await policy.execute(async () => {
          attempts++;
          throw new Error("always fail");
        });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(MaxRetriesExceededError);
        expect((err as MaxRetriesExceededError).attempts).toBe(3);
      }
      expect(attempts).toBe(3);
    });

    test("MaxRetriesExceededError contiene el último error", async () => {
      const policy = new RetryPolicy({ maxRetries: 2, baseDelayMs: 5 });
      const lastError = new Error("last error");

      try {
        await policy.execute(async () => { throw lastError; });
        expect.unreachable();
      } catch (err) {
        expect((err as MaxRetriesExceededError).lastError).toBe(lastError);
        expect((err as MaxRetriesExceededError).message).toContain("last error");
      }
    });
  });

  describe("retryable filter", () => {
    test("no reintenta si el error no es retryable", async () => {
      const policy = new RetryPolicy({
        maxRetries: 3,
        baseDelayMs: 5,
        retryable: (err) => (err as Error).message !== "fatal",
      });

      let attempts = 0;
      try {
        await policy.execute(async () => {
          attempts++;
          throw new Error("fatal");
        });
        expect.unreachable();
      } catch (err) {
        expect((err as Error).message).toBe("fatal");
      }
      expect(attempts).toBe(1);
    });
  });

  describe("calculateDelay", () => {
    test("exponential: crece exponencialmente con el intento", () => {
      const policy = new RetryPolicy({ backoff: "exponential", baseDelayMs: 1000, jitter: false });

      const d1 = policy.calculateDelay(1);
      const d2 = policy.calculateDelay(2);
      const d3 = policy.calculateDelay(3);

      expect(d1).toBe(1000);
      expect(d2).toBe(2000);
      expect(d3).toBe(4000);
    });

    test("fixed: delay constante", () => {
      const policy = new RetryPolicy({ backoff: "fixed", baseDelayMs: 1000, jitter: false });

      expect(policy.calculateDelay(1)).toBe(1000);
      expect(policy.calculateDelay(3)).toBe(1000);
      expect(policy.calculateDelay(5)).toBe(1000);
    });

    test("linear: delay = base * attempt", () => {
      const policy = new RetryPolicy({ backoff: "linear", baseDelayMs: 1000, jitter: false });

      expect(policy.calculateDelay(1)).toBe(1000);
      expect(policy.calculateDelay(2)).toBe(2000);
      expect(policy.calculateDelay(3)).toBe(3000);
    });

    test("maxDelayMs limita el delay máximo", () => {
      const policy = new RetryPolicy({
        backoff: "exponential",
        baseDelayMs: 10000,
        maxDelayMs: 15000,
        jitter: false,
      });

      expect(policy.calculateDelay(2)).toBe(15000); // 20000 > 15000
    });

    test("jitter: delay varía entre 50-100% del calculado", () => {
      const policy = new RetryPolicy({ backoff: "fixed", baseDelayMs: 1000, jitter: true });

      const delays = Array.from({ length: 50 }, () => policy.calculateDelay(1));
      const withinRange = delays.every((d) => d >= 500 && d <= 1000);
      expect(withinRange).toBe(true);
    });
  });
});
