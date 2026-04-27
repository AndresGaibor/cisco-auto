import { describe, expect, test } from "bun:test";

import { validateGeneratedArtifacts } from "../../build/validation.js";

describe("build validation", () => {
  test("no bloquea el build por advertencias PT-safe", () => {
    const main = "function main() {} function cleanUp() {} function createKernel() {}";
    const catalog = "var catalog = 1;";
    const runtime = "var runtimeDispatcher = 1; var _ptDispatch = 1; var runtime = globalThis;";

    expect(() => validateGeneratedArtifacts(main, catalog, runtime)).not.toThrow();
  });
});
