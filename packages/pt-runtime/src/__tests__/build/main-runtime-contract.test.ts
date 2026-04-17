import { expect, test, describe } from "bun:test";
import { renderMainV2, renderRuntimeV2Sync } from "../../build";

describe("main/runtime contract", () => {
  test("main.js solo bootstrappea el kernel", () => {
    const main = renderMainV2({ srcDir: "src", outputPath: "/tmp/main.js", injectDevDir: "/tmp/pt-dev" });

    expect(main).toContain("createKernel(");
    expect(main).toContain("function main()");
    expect(main).toContain("function cleanUp()");
  });

  test("runtime.js publica _ptDispatch y runtimeDispatcher", () => {
    const runtime = renderRuntimeV2Sync({ srcDir: "src", outputPath: "/tmp/runtime.js", injectDevDir: "/tmp/pt-dev" });

    expect(runtime).toContain("runtimeDispatcher");
    expect(runtime).toContain("_ptDispatch");
  });
});
