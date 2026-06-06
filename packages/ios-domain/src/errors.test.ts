import { describe, expect, test } from "bun:test";
import { createIosError, IOS_ERROR_CODES } from "./errors.js";

describe("createIosError", () => {
  test("infiere retryable y phase para TIMEOUT", () => {
    const error = createIosError({
      code: IOS_ERROR_CODES.TIMEOUT,
      message: "command timed out",
      command: "show ip route",
    });

    expect(error.retryable).toBe(true);
    expect(error.phase).toBe("execute");
    expect(error.command).toBe("show ip route");
  });

  test("marca PASSWORD_REQUIRED como preflight", () => {
    const error = createIosError({
      code: IOS_ERROR_CODES.PASSWORD_REQUIRED,
      message: "password required",
    });

    expect(error.phase).toBe("preflight");
    expect(error.retryable).toBe(false);
  });
});
