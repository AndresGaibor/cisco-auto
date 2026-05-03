import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { retrySync, isRetryableFsError } from "./fs-retry.js";

describe("fs-retry", () => {
  test("identifica errores fs retryables", () => {
    expect(isRetryableFsError({ code: "EPERM" })).toBe(true);
    expect(isRetryableFsError({ code: "EACCES" })).toBe(true);
    expect(isRetryableFsError({ code: "EBUSY" })).toBe(true);
    expect(isRetryableFsError({ code: "ENOENT" })).toBe(false);
  });

  test("reintenta hasta que la operación tenga éxito", () => {
    let attempts = 0;

    const result = retrySync(() => {
      attempts++;
      if (attempts < 3) {
        const error = new Error("busy") as NodeJS.ErrnoException;
        error.code = "EBUSY";
        throw error;
      }

      return "ok";
    }, {
      attempts: 4,
      baseDelayMs: 0,
      maxDelayMs: 0,
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  test("no reintenta errores no retryables", () => {
    let attempts = 0;

    expect(() => retrySync(() => {
      attempts++;
      const error = new Error("missing") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }, {
      attempts: 4,
      baseDelayMs: 0,
      maxDelayMs: 0,
    })).toThrow("missing");

    expect(attempts).toBe(1);
  });
});
