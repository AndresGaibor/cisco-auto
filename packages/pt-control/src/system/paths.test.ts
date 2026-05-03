import { describe, expect, test } from "bun:test";

import {
  looksLikeWindowsAbsolutePath,
  normalizeHostPath,
  isForeignWindowsPathOnThisHost,
  resolvePtDevDir,
} from "./paths.js";

describe("system paths", () => {
  test("detecta rutas Windows absolutas", () => {
    expect(looksLikeWindowsAbsolutePath("C:\\Users\\Andres\\pt-dev")).toBe(true);
    expect(looksLikeWindowsAbsolutePath("\\\\server\\share\\pt-dev")).toBe(true);
  });

  test("normaliza rutas Windows con separadores y sin slash final", () => {
    expect(normalizeHostPath("C:\\Users\\Andres\\pt-dev\\")).toBe(
      "C:/Users/Andres/pt-dev",
    );
  });

  test("usa PT_DEV_DIR si existe", () => {
    expect(resolvePtDevDir({ PT_DEV_DIR: "C:\\Users\\Andres\\pt-dev" } as any)).toBe(
      "C:/Users/Andres/pt-dev",
    );
  });

  test("detecta ruta Windows extranjera en este host", () => {
    expect(isForeignWindowsPathOnThisHost("C:\\Users\\Andres\\pt-dev")).toBe(true);
  });
});
