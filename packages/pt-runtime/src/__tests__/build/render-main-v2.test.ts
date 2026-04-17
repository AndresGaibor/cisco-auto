import { describe, expect, test } from "bun:test";

import { renderMainV2 } from "../../build/render-main-v2";

describe("renderMainV2", () => {
  test("exposes dprint through appWindow writeToPT fallback", () => {
    const output = renderMainV2({
      srcDir: "src",
      outputPath: "out",
      injectDevDir: "/pt-dev",
    } as any);

    expect(output).toContain("writeToPT");
    expect(output).toContain("print(String(msg))");
    expect(output).toContain("_g.dprint = dprint");
  });

  test("captures ipc from global object", () => {
    const output = renderMainV2({
      srcDir: "src",
      outputPath: "out",
      injectDevDir: "/pt-dev",
    } as any);

    expect(output).toContain("_g.ipc = ipc");
    expect(output).toContain("_g.ipc");
  });
});
