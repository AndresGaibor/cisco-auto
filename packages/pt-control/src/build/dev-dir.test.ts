import { describe, expect, test } from "bun:test";

import {
  looksLikeWindowsAbsolutePath,
  normalizeEnvPath,
  resolveDevDir,
} from "./dev-dir.js";

describe("resolveDevDir", () => {
  test("preserva ruta Windows absoluta aunque corra en macOS/Linux", () => {
    expect(normalizeEnvPath("C:\\Users\\Andres\\pt-dev")).toBe(
      "C:/Users/Andres/pt-dev",
    );
  });

  test("detecta UNC path", () => {
    expect(looksLikeWindowsAbsolutePath("\\\\server\\share\\pt-dev")).toBe(true);
  });

  test("usa PT_DEV_DIR si existe", () => {
    expect(resolveDevDir({ PT_DEV_DIR: "C:\\Users\\Andres\\pt-dev" } as any)).toBe(
      "C:/Users/Andres/pt-dev",
    );
  });
});
