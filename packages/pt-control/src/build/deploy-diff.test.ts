import { describe, expect, test } from "bun:test";

import { classifyDeploy, type ArtifactDiff } from "./deploy-diff.js";

function diff(name: ArtifactDiff["name"], changed: boolean): ArtifactDiff {
  return {
    name,
    srcPath: `/generated/${name}`,
    destPath: `/pt-dev/${name}`,
    beforeHash: changed ? "aaa" : "bbb",
    afterHash: "bbb",
    changed,
  };
}

describe("classifyDeploy", () => {
  test("main changed requires manual reload", () => {
    const result = classifyDeploy([
      diff("main.js", true),
      diff("runtime.js", false),
      diff("catalog.js", false),
      diff("manifest.json", false),
    ]);

    expect(result.manualMainReloadRequired).toBe(true);
    expect(result.runtimeWakeupRecommended).toBe(false);
    expect(result.noReloadRequired).toBe(false);
  });

  test("runtime changed without main uses runtime wakeup", () => {
    const result = classifyDeploy([
      diff("main.js", false),
      diff("runtime.js", true),
      diff("catalog.js", false),
      diff("manifest.json", false),
    ]);

    expect(result.manualMainReloadRequired).toBe(false);
    expect(result.runtimeWakeupRecommended).toBe(true);
    expect(result.noReloadRequired).toBe(false);
  });

  test("no changes is idempotent", () => {
    const result = classifyDeploy([
      diff("main.js", false),
      diff("runtime.js", false),
      diff("catalog.js", false),
      diff("manifest.json", false),
    ]);

    expect(result.noReloadRequired).toBe(true);
  });
});
