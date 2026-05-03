import { describe, expect, test } from "bun:test";

import { RuntimeGenerator } from "../../index.js";

describe("build artifacts idempotency", () => {
  test("main.js no contiene timestamps ni query dinámica", () => {
    const generator = new RuntimeGenerator({
      outputDir: "/tmp/pt-runtime-generated",
      devDir: "/tmp/pt-dev",
    });

    const main = generator.generateMain();

    expect(main).not.toContain("Generated at:");
    expect(main).not.toContain("Build ID:");
    expect(main).not.toContain("runtime.js?v=");
  });

  test("runtime.js no contiene timestamps", () => {
    const generator = new RuntimeGenerator({
      outputDir: "/tmp/pt-runtime-generated",
      devDir: "/tmp/pt-dev",
    });

    const runtime = generator.generateRuntime();

    expect(runtime).not.toContain("Generated at:");
  });

  test("catalog.js no contiene timestamps", () => {
    const generator = new RuntimeGenerator({
      outputDir: "/tmp/pt-runtime-generated",
      devDir: "/tmp/pt-dev",
    });

    const catalog = generator.generateCatalog();

    expect(catalog).not.toContain("Generated at:");
  });

  test("manifest.json no expone generatedAt", async () => {
    const generator = new RuntimeGenerator({
      outputDir: "/tmp/pt-runtime-generated",
      devDir: "/tmp/pt-dev",
    });

    const { manifest } = await generator.build();

    expect(manifest).not.toHaveProperty("generatedAt");
  });
});
