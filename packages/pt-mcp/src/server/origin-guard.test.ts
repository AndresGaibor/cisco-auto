import { describe, expect, test } from "bun:test";

import { isAllowedOrigin } from "./origin-guard.js";

describe("isAllowedOrigin", () => {
  test("permite origen ausente, local y OpenAI", () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("https://chatgpt.com")).toBe(true);
  });

  test("rechaza origen desconocido sin allowlist", () => {
    expect(isAllowedOrigin("https://example.com")).toBe(false);
  });
});
