// ============================================================================
// IOS Session Utils Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { withTimeout, inferExpectedModeAfterCommand, DEFAULT_COMMAND_TIMEOUT, DEFAULT_STALL_TIMEOUT } from "../../../packages/pt-runtime/src/handlers/ios/ios-session-utils.ts";

describe("ios-session-utils", () => {
  describe("withTimeout", () => {
    it("should resolve when promise resolves within timeout", async () => {
      const result = await withTimeout(Promise.resolve("ok"), 1000, "Should not timeout");
      expect(result).toBe("ok");
    });

    it("should reject when promise takes too long", async () => {
      const slowPromise = new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 200));
      await expect(withTimeout(slowPromise, 50, "Timed out")).rejects.toThrow("Timed out");
    });

    it("should reject with custom message", async () => {
      const slowPromise = new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 500));
      await expect(withTimeout(slowPromise, 10, "Custom timeout message")).rejects.toThrow("Custom timeout message");
    });
  });

  describe("inferExpectedModeAfterCommand", () => {
    it("should return global-config for configure terminal", () => {
      expect(inferExpectedModeAfterCommand("configure terminal")).toBe("global-config");
      expect(inferExpectedModeAfterCommand("config t")).toBe("global-config");
      expect(inferExpectedModeAfterCommand("conf")).toBe("global-config");
      expect(inferExpectedModeAfterCommand("configure")).toBe("global-config");
    });

    it("should return config-if for interface commands", () => {
      expect(inferExpectedModeAfterCommand("interface GigabitEthernet0/0")).toBe("config-if");
      expect(inferExpectedModeAfterCommand("interface FastEthernet0/1")).toBe("config-if");
    });

    it("should return config-line for line commands", () => {
      expect(inferExpectedModeAfterCommand("line console 0")).toBe("config-line");
      expect(inferExpectedModeAfterCommand("line vty 0 4")).toBe("config-line");
    });

    it("should return config-router for router commands", () => {
      expect(inferExpectedModeAfterCommand("router ospf 1")).toBe("config-router");
      expect(inferExpectedModeAfterCommand("router eigrp 100")).toBe("config-router");
    });

    it("should return config-vlan for vlan commands", () => {
      expect(inferExpectedModeAfterCommand("vlan 10")).toBe("config-vlan");
      expect(inferExpectedModeAfterCommand("vlan 100")).toBe("config-vlan");
    });

    it("should return privileged-exec for end/^z", () => {
      expect(inferExpectedModeAfterCommand("end")).toBe("privileged-exec");
      expect(inferExpectedModeAfterCommand("^z")).toBe("privileged-exec");
    });

    it("should return undefined for unknown commands", () => {
      expect(inferExpectedModeAfterCommand("show ip int brief")).toBeUndefined();
      expect(inferExpectedModeAfterCommand("some random command")).toBeUndefined();
    });

    it("should be case insensitive", () => {
      expect(inferExpectedModeAfterCommand("CONFIGURE TERMINAL")).toBe("global-config");
      expect(inferExpectedModeAfterCommand("INTERFACE Gig0/0")).toBe("config-if");
    });
  });

  describe("DEFAULT_TIMEOUT constants", () => {
    it("should have valid timeout values", () => {
      expect(DEFAULT_COMMAND_TIMEOUT).toBe(8000);
      expect(DEFAULT_STALL_TIMEOUT).toBe(15000);
    });
  });
});
