import { describe, it, expect } from "bun:test";
import { parseAddLinkPayload, AddLinkPayloadRawSchema, ExecIosPayloadSchema } from "../src/types/commands.js";

describe("Bridge Contract - Legacy & v2 Compatibility", () => {
  describe("addLink payload normalization", () => {
    it("accepts v2 format (device1/device2/linkType)", () => {
      const raw = {
        id: "cmd_123",
        type: "addLink" as const,
        device1: "Router1",
        port1: "GigabitEthernet0/0",
        device2: "Switch1",
        port2: "GigabitEthernet0/1",
        linkType: "straight" as const,
      };

      const result = parseAddLinkPayload(raw);
      
      expect(result.device1).toBe("Router1");
      expect(result.device2).toBe("Switch1");
      expect(result.linkType).toBe("straight");
    });

    it("accepts legacy format (dev1/dev2/cableType)", () => {
      const raw = {
        id: "cmd_456",
        type: "addLink" as const,
        dev1: "Router1",
        port1: "GigabitEthernet0/0",
        dev2: "Switch1",
        port2: "GigabitEthernet0/1",
        cableType: "cross" as const,
      };

      const result = parseAddLinkPayload(raw);
      
      expect(result.device1).toBe("Router1");
      expect(result.device2).toBe("Switch1");
      expect(result.linkType).toBe("cross");
    });

    it("prefers v2 fields when both are provided", () => {
      const raw = {
        id: "cmd_789",
        type: "addLink" as const,
        device1: "Router1-v2",
        dev1: "Router1-legacy",
        port1: "GigabitEthernet0/0",
        device2: "Switch1-v2",
        dev2: "Switch1-legacy",
        port2: "GigabitEthernet0/1",
        linkType: "fiber" as const,
        cableType: "roll" as const,
      };

      const result = parseAddLinkPayload(raw);
      
      expect(result.device1).toBe("Router1-v2");
      expect(result.device2).toBe("Switch1-v2");
      expect(result.linkType).toBe("fiber");
    });

    it("uses default linkType when not provided", () => {
      const raw = {
        id: "cmd_default",
        type: "addLink" as const,
        device1: "Router1",
        port1: "GigabitEthernet0/0",
        device2: "Switch1",
        port2: "GigabitEthernet0/1",
      };

      const result = parseAddLinkPayload(raw);
      
      expect(result.linkType).toBe("auto");
    });

    it("throws when device1/dev1 is missing", () => {
      const raw = {
        id: "cmd_err",
        type: "addLink" as const,
        port1: "GigabitEthernet0/0",
        device2: "Switch1",
        port2: "GigabitEthernet0/1",
      };

      expect(() => parseAddLinkPayload(raw)).toThrow();
    });

    it("throws when device2/dev2 is missing", () => {
      const raw = {
        id: "cmd_err2",
        type: "addLink" as const,
        device1: "Router1",
        port1: "GigabitEthernet0/0",
        port2: "GigabitEthernet0/1",
      };

      expect(() => parseAddLinkPayload(raw)).toThrow();
    });
  });

  describe("AddLinkPayloadRawSchema validation", () => {
    it("validates v2 format", () => {
      const data = {
        id: "cmd_123",
        type: "addLink" as const,
        device1: "Router1",
        port1: "GigabitEthernet0/0",
        device2: "Switch1",
        port2: "GigabitEthernet0/1",
        linkType: "straight" as const,
      };

      const result = AddLinkPayloadRawSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates legacy format", () => {
      const data = {
        id: "cmd_456",
        type: "addLink" as const,
        dev1: "Router1",
        port1: "GigabitEthernet0/0",
        dev2: "Switch1",
        port2: "GigabitEthernet0/1",
        cableType: "cross" as const,
      };

      const result = AddLinkPayloadRawSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("ExecIosPayloadSchema - parse field compatibility", () => {
    it("uses default parse=true when not provided", () => {
      const data = {
        id: "cmd_exec1",
        type: "execIos" as const,
        device: "Router1",
        command: "show ip int brief",
      };

      const result = ExecIosPayloadSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parse).toBe(true);
      }
    });

    it("preserves explicit parse=false", () => {
      const data = {
        id: "cmd_exec2",
        type: "execIos" as const,
        device: "Router1",
        command: "show ip int brief",
        parse: false,
      };

      const result = ExecIosPayloadSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parse).toBe(false);
      }
    });

    it("preserves explicit parse=true", () => {
      const data = {
        id: "cmd_exec3",
        type: "execIos" as const,
        device: "Router1",
        command: "show running-config",
        parse: true,
      };

      const result = ExecIosPayloadSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parse).toBe(true);
      }
    });

    it("applies default timeout when not provided", () => {
      const data = {
        id: "cmd_exec4",
        type: "execIos" as const,
        device: "Router1",
        command: "show version",
      };

      const result = ExecIosPayloadSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeout).toBe(5000);
      }
    });
  });
});
