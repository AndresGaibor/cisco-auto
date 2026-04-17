import { expect, test, describe } from "bun:test";
import { renderMainV2, renderRuntimeV2Sync } from "../../build";
import { getAllMainFiles } from "../../build/main-manifest";

describe("main/runtime contract", () => {
  test("main.js solo bootstrappea el kernel", () => {
    const main = renderMainV2({ srcDir: "src", outputPath: "/tmp/main.js", injectDevDir: "/tmp/pt-dev" });

    expect(main).toContain("createKernel(");
    expect(main).toContain("function main()");
    expect(main).toContain("function cleanUp()");
    expect(getAllMainFiles()).toContain("pt/kernel/kernel-state.ts");
    expect(getAllMainFiles()).toContain("pt/kernel/file-access.ts");
    expect(getAllMainFiles()).toContain("pt/kernel/queue-index.ts");
    expect(getAllMainFiles()).toContain("pt/kernel/queue-discovery.ts");
    expect(getAllMainFiles()).toContain("pt/kernel/dead-letter.ts");
    expect(getAllMainFiles()).toContain("pt/kernel/queue-cleanup.ts");
    expect(getAllMainFiles()).toContain("pt/kernel/queue-claim.ts");
    expect(getAllMainFiles()).toContain("pt/terminal/command-executor.ts");
  });

  test("runtime.js publica _ptDispatch y runtimeDispatcher", () => {
    const runtime = renderRuntimeV2Sync({ srcDir: "src", outputPath: "/tmp/runtime.js", injectDevDir: "/tmp/pt-dev" });

    expect(runtime).toContain("runtimeDispatcher");
    expect(runtime).toContain("_ptDispatch");
  });
});
