import { afterEach, describe, expect, test, vi } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";

let fakeHome = "";

vi.mock("node:os", () => ({
  homedir: () => fakeHome,
}));

import { createDeviceKindResolver } from "./device-kind-resolver.js";

describe("createDeviceKindResolver", () => {
  let tempRoot = "";

  afterEach(() => {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
    fakeHome = "";
    delete process.env.PT_DEV_DIR;
  });

  test("usa el directorio pt-dev del host cuando no hay PT_DEV_DIR", async () => {
    tempRoot = mkdtempSync(join(process.cwd(), "tmp-device-kind-"));
    fakeHome = tempRoot;
    mkdirSync(join(tempRoot, "pt-dev", "cache"), { recursive: true });

    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: "pc", model: "PC-PT" }),
        inspectDevice: async () => ({ type: "pc", model: "PC-PT" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("PC1");

    expect(kind).toBe("host");
    expect(
      await Bun.file(join(tempRoot, "pt-dev", "cache", "device-kind-cache.json")).exists(),
    ).toBe(true);
  });
});
