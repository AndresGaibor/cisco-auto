// ============================================================================
// Host Stabilize Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { hostEchoLooksTruncated } from "../../../packages/pt-runtime/src/handlers/ios/host-stabilize.ts";

describe("host-stabilize", () => {
  describe("hostEchoLooksTruncated", () => {
    it("should return false when output contains full expected command", () => {
      const output = "ping 192.168.1.1\nReply from 192.168.1.1...";
      expect(hostEchoLooksTruncated(output, "ping 192.168.1.1")).toBe(false);
    });

    it("should return true when output looks truncated (missing first char)", () => {
      const output = "ing 192.168.1.1\nReply from 192.168.1.1...";
      expect(hostEchoLooksTruncated(output, "ping 192.168.1.1")).toBe(true);
    });

    it("should return false when expected is too short", () => {
      expect(hostEchoLooksTruncated("abc", "a")).toBe(false);
      expect(hostEchoLooksTruncated("abc", "")).toBe(false);
    });

    it("should return false when output does not contain command at all", () => {
      const output = "some completely different output";
      expect(hostEchoLooksTruncated(output, "ping 192.168.1.1")).toBe(false);
    });

    it("should be case insensitive", () => {
      const output = "ING 192.168.1.1";
      expect(hostEchoLooksTruncated(output, "ping 192.168.1.1")).toBe(true);
    });

    it("should handle null/undefined output", () => {
      expect(hostEchoLooksTruncated("", "ping 192.168.1.1")).toBe(false);
      expect(hostEchoLooksTruncated("", "ping")).toBe(false);
    });
  });
});
