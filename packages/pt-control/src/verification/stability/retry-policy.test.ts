import { describe, expect, test, vi } from "bun:test";
import {
  RetryPolicy,
  NETWORK_RETRY_POLICY,
  FILE_RETRY_POLICY,
  PT_RETRY_POLICY,
  crearRetryPolicy,
} from "./retry-policy.js";

describe("RetryPolicy", () => {
  test("ejecuta función exitosamente sin reintentos", async () => {
    const policy = new RetryPolicy({ maxRetries: 3 });
    const fn = vi.fn().mockResolvedValue("success");

    const result = await policy.execute(fn);

    expect(result.ok).toBe(true);
    expect(result.result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("reintenta en caso de error recuperable", async () => {
    const policy = new RetryPolicy({ maxRetries: 3, initialDelayMs: 10 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("success");

    const result = await policy.execute(fn);

    expect(result.ok).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("no reintenta errores no recuperables", async () => {
    const policy = new RetryPolicy({ maxRetries: 3 });
    const fn = vi.fn().mockRejectedValue(new Error("syntax error"));

    const result = await policy.execute(fn);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("syntax error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("limita reintentos a maxRetries", async () => {
    const policy = new RetryPolicy({ maxRetries: 2, initialDelayMs: 5 });
    const fn = vi.fn().mockRejectedValue(new Error("timeout"));

    const result = await policy.execute(fn);

    expect(result.ok).toBe(false);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("callback onRetry es llamado en cada reintento", async () => {
    const policy = new RetryPolicy({ maxRetries: 2, initialDelayMs: 5 });
    const fn = vi.fn().mockRejectedValue(new Error("timeout"));
    const onRetry = vi.fn();

    await policy.execute(fn, { onRetry });

    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  test("calcularDelay usa backoff exponencial", () => {
    const policy = new RetryPolicy({
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      useJitter: false,
    });

    expect(policy.calcularDelay(0)).toBe(1000);
    expect(policy.calcularDelay(1)).toBe(2000);
    expect(policy.calcularDelay(2)).toBe(4000);
  });

  test("calcularDelay respecula maxDelayMs", () => {
    const policy = new RetryPolicy({
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 3000,
      useJitter: false,
    });

    expect(policy.calcularDelay(10)).toBe(3000);
  });

  test("esErrorRecuperable detecta errores de red", () => {
    const policy = new RetryPolicy();

    expect(policy.esErrorRecuperable("Connection timeout")).toBe(true);
    expect(policy.esErrorRecuperable("ECONNRESET")).toBe(true);
    expect(policy.esErrorRecuperable("ETIMEDOUT")).toBe(true);
    expect(policy.esErrorRecuperable("syntax error")).toBe(false);
  });

  test("withConfig crea policy con configuración override", () => {
    const policy = new RetryPolicy({ maxRetries: 3 });
    const newPolicy = policy.withConfig({ maxRetries: 5 });

    expect(policy.getConfig().maxRetries).toBe(3);
    expect(newPolicy.getConfig().maxRetries).toBe(5);
  });

  test("getConfig retorna copia de configuración", () => {
    const policy = new RetryPolicy({ maxRetries: 3 });
    const config = policy.getConfig();

    expect(config.maxRetries).toBe(3);
    expect(config.maxRetries).not.toBe(99);
  });
});

describe("crearRetryPolicy", () => {
  test("crearRetryPolicy(network) retorna NETWORK_RETRY_POLICY", () => {
    const policy = crearRetryPolicy("network");
    expect(policy).toBe(NETWORK_RETRY_POLICY);
  });

  test("crearRetryPolicy(file) retorna FILE_RETRY_POLICY", () => {
    const policy = crearRetryPolicy("file");
    expect(policy).toBe(FILE_RETRY_POLICY);
  });

  test("crearRetryPolicy(pt) retorna PT_RETRY_POLICY", () => {
    const policy = crearRetryPolicy("pt");
    expect(policy).toBe(PT_RETRY_POLICY);
  });

  test("crearRetryPolicy(strict) crea policy con reintentos limitados", () => {
    const policy = crearRetryPolicy("strict");
    const config = policy.getConfig();

    expect(config.maxRetries).toBe(5);
    expect(config.initialDelayMs).toBe(2000);
    expect(config.retryableErrors).toContain("timeout");
  });

  test("crearRetryPolicy(lenient) crea policy lenient", async () => {
    const policy = crearRetryPolicy("lenient");
    const fn = vi.fn().mockRejectedValue(new Error("timeout"));

    const result = await policy.execute(fn);

    expect(result.ok).toBe(false);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("RetryPolicy presets", () => {
  test("NETWORK_RETRY_POLICY tiene configuración apropiada", () => {
    const config = NETWORK_RETRY_POLICY.getConfig();

    expect(config.maxRetries).toBe(3);
    expect(config.initialDelayMs).toBe(1000);
    expect(config.retryableErrors).toContain("timeout");
    expect(config.useJitter).toBe(true);
  });

  test("FILE_RETRY_POLICY no usa jitter", () => {
    const config = FILE_RETRY_POLICY.getConfig();

    expect(config.useJitter).toBe(false);
    expect(config.retryableErrors).toContain("ENOENT");
  });

  test("PT_RETRY_POLICY tiene más reintentos", () => {
    const config = PT_RETRY_POLICY.getConfig();

    expect(config.maxRetries).toBe(5);
    expect(config.retryableErrors).toContain("timeout");
  });
});
