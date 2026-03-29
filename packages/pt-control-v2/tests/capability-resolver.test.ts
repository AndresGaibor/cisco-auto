import { describe, it, expect } from "bun:test";
import { resolveCapabilities, type DeviceCapabilities } from "../src/ios/capabilities/pt-capability-resolver";
import { IOSFamily, getIosFamilyFromModel } from "../src/ios/capabilities/device-capabilities";

// Test cases for capability resolver
describe("IOS Capability Resolver", () => {
  // 2960 does NOT support trunk encapsulation dot1q command
  it("2960 should NOT support switchport trunk encapsulation dot1q", () => {
    const caps = resolveCapabilities("2960-24TT");
    expect(caps.supportsTrunkEncapsulation).toBe(false);
  });

  // Router-on-a-stick supports subinterfaces with dot1q
  it("2911 should support router-on-a-stick subinterfaces", () => {
    const caps = resolveCapabilities("2911");
    expect(caps.supportsSubinterfaces).toBe(true);
    expect(caps.supportsDot1qEncapsulation).toBe(true);
  });

  // Multilayer switch supports SVI and ip routing
  it("Multilayer switch should support SVI and ip routing", () => {
    const caps = resolveCapabilities("3560-24PS");
    expect(caps.supportsSvi).toBe(true);
    expect(caps.supportsIpRouting).toBe(true);
  });

  // DHCP relay is supported on routers and multilayer switches
  it("2911 should support DHCP relay (ip helper-address)", () => {
    const caps = resolveCapabilities("2911");
    expect(caps.supportsDhcpRelay).toBe(true);
  });

  it("2960 should NOT support DHCP relay (no layer 3)", () => {
    const caps = resolveCapabilities("2960-24TT");
    expect(caps.supportsDhcpRelay).toBe(false);
  });

  // Verify correct family detection
  it("should detect correct IOS family", () => {
    const family = getIosFamilyFromModel("2960-24TT");
    expect(family).toBe(IOSFamily.SWITCH_L2);

    const familyRouter = getIosFamilyFromModel("2911");
    expect(familyRouter).toBe(IOSFamily.ROUTER);
  });

  // Verify feature flags
  it("should return correct feature flags for 1941", () => {
    const caps = resolveCapabilities("1941");
    expect(caps.supportsAcl).toBe(true);
    expect(caps.supportsNat).toBe(true);
    expect(caps.supportsVlan).toBe(false); // Router, no VLANs like switch
    expect(caps.maxVlanCount).toBe(0);
  });

  it("should return correct feature flags for 2960-48TC-L", () => {
    const caps = resolveCapabilities("2960-48TC-L");
    expect(caps.supportsVlan).toBe(true);
    expect(caps.maxVlanCount).toBe(255);
    expect(caps.supportsSvi).toBe(false); // L2 switch
    expect(caps.supportsIpRouting).toBe(false);
  });
});
