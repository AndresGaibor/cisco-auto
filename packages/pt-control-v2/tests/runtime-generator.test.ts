import { describe, expect, it } from "bun:test";
import { renderMainSource } from "../src/runtime-generator/index.js";
import { resolveCapabilities } from "../src/domain/ios/capabilities/pt-capability-resolver";

describe("RuntimeGenerator helpers", () => {
  it("injects the DEV_DIR literal and escapes characters", () => {
    const devDir = '/tmp/pt "control"';
    const literal = JSON.stringify(devDir);
    const source = renderMainSource(devDir);
    expect(source).toContain(`var DEV_DIR = ${literal};`);
    expect(source).toContain("PT Control V2 - Main Script Module");
  });
});

describe("IOS Session Contract", () => {
  it("capability resolver returns correct flags for 2960", () => {
    const caps = resolveCapabilities("2960-24TT");
    expect(caps.supportsTrunkEncapsulation).toBe(false);
    expect(caps.supportsDhcpRelay).toBe(false);
  });

  it("capability resolver returns correct flags for 2911 router", () => {
    const caps = resolveCapabilities("2911");
    expect(caps.supportsSubinterfaces).toBe(true);
    expect(caps.supportsDhcpRelay).toBe(true);
  });

  it("capability resolver returns correct flags for 3560 L3 switch", () => {
    const caps = resolveCapabilities("3560-24PS");
    expect(caps.supportsSvi).toBe(true);
    expect(caps.supportsIpRouting).toBe(true);
  });
});
