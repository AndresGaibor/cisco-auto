import { describe, expect, test } from "bun:test";

import { renderMainV2 } from "../../build/render-main-v2.js";

describe("Windows path injection", () => {
  test("main.js inyecta PT_DEV_DIR Windows con forward slashes", () => {
    const code = renderMainV2({
      srcDir: "src",
      outputPath: "",
      injectDevDir: "C:\\Users\\Andres\\pt-dev",
    });

    expect(code).toContain('"C:/Users/Andres/pt-dev"');
    expect(code).not.toContain("C:\\\\Users");
  });
});
