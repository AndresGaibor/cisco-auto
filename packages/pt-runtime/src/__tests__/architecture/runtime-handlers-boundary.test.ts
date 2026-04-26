import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("runtime handlers architecture boundary", () => {
  test("runtime-handlers does not import unsafe handler implementations directly", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../handlers/runtime-handlers.ts"),
      "utf8",
    );

    const forbiddenImports = [
      "./evaluate",
      "./omniscience-physical",
      "./omniscience-logical",
      "./omniscience-environment",
      "./omniscience-telepathy",
      "./omniscience-utils",
    ];

    for (const forbidden of forbiddenImports) {
      expect(source).not.toContain(forbidden);
    }
  });

  test("stable registration does not mention unsafe handler names", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../handlers/registration/stable-handlers.ts"),
      "utf8",
    );

    const unsafeNames = [
      "__evaluate",
      "omni.evaluate.raw",
      "omni.physical.siphon",
      "omni.logical.siphonConfigs",
      "siphonAllConfigs",
      "evaluateInternalVariable",
      "exfiltrateHostFile",
      "skipBoot",
      "siphonDesktopApps",
      "siphonActiveProcesses",
      "kvStore",
      "base64",
      "cryptoUtils",
    ];

    for (const name of unsafeNames) {
      expect(source).not.toContain(`"${name}"`);
      expect(source).not.toContain(`'${name}'`);
    }
  });

  test("unsafe handlers are isolated in experimental or omni registration files", () => {
    const experimental = readFileSync(
      join(import.meta.dir, "../../handlers/registration/experimental-handlers.ts"),
      "utf8",
    );

    const omni = readFileSync(
      join(import.meta.dir, "../../handlers/registration/omni-handlers.ts"),
      "utf8",
    );

    expect(experimental).toContain("__evaluate");
    expect(experimental).toContain("omni.evaluate.raw");

    expect(omni).toContain("siphonAllConfigs");
    expect(omni).toContain("exfiltrateHostFile");
    expect(omni).toContain("skipBoot");
  });
});
