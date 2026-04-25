import { describe, expect, test } from "bun:test";
import {
  buildHostConfigPayload,
  buildHostConfigPlanText,
  executeHostCommand,
  executeHostConfig,
  executeHostHistory,
  executeHostInspect,
  normalizeHostDeviceType,
  type HostControllerPort,
} from "./host-use-cases.js";

class FakeHostController implements HostControllerPort {
  readonly configured: Array<{ device: string; payload: unknown }> = [];

  async configHost(device: string, options: unknown): Promise<void> {
    this.configured.push({ device, payload: options });
  }

  async inspectHost(device: string) {
    if (device === "missing") return null;
    return { name: device, model: "PC-PT", type: "pc", ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1", dns: "8.8.8.8", dhcp: false };
  }

  async getHostHistory(device: string) {
    return { entries: [{ command: "ipconfig", output: "FastEthernet0 Connection", timestamp: 1 }], count: 1, raw: "> ipconfig\nFastEthernet0 Connection", methods: ["history-buffer"] };
  }

  async inspectDevice(device: string) {
    if (device === "Switch1") return { type: "switch" };
    return { type: "pc" };
  }

  async execIos(device: string, command: string) {
    return { ok: true, raw: `IOS:${device}:${command}`, evidence: {}, warnings: [] };
  }

  async execHost(device: string, command: string, capabilityId: string, options?: { timeoutMs?: number }) {
    return { success: true, raw: `HOST:${device}:${command}`, verdict: { ok: true }, parsed: {} };
  }
}

describe("host use cases", () => {
  test("normalizes Packet Tracer numeric device types", () => {
    expect(normalizeHostDeviceType(0)).toBe("router");
    expect(normalizeHostDeviceType(1)).toBe("switch");
    expect(normalizeHostDeviceType(16)).toBe("switch_layer3");
    expect(normalizeHostDeviceType(999)).toBe("unknown");
    expect(normalizeHostDeviceType("pc")).toBe("pc");
  });

  test("buildHostConfigPayload creates DHCP payload", () => {
    expect(buildHostConfigPayload({ deviceName: "PC1", dhcp: true, ip: "192.168.1.10", mask: "255.255.255.0" })).toEqual({ dhcp: true });
  });

  test("buildHostConfigPayload validates static IPv4 config", () => {
    expect(buildHostConfigPayload({ deviceName: "PC1", ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1", dns: "8.8.8.8" })).toEqual({ dhcp: false, ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1", dns: "8.8.8.8" });
    expect(() => buildHostConfigPayload({ deviceName: "PC1", ip: "999.168.1.10", mask: "255.255.255.0" })).toThrow();
    expect(() => buildHostConfigPayload({ deviceName: "PC1", ip: "192.168.1.10", mask: "255.0.255.0" })).toThrow();
  });

  test("buildHostConfigPlanText documents static and DHCP flows", () => {
    expect(buildHostConfigPlanText({ deviceName: "PC1", dhcp: true })).toContain("Activar DHCP");
    expect(buildHostConfigPlanText({ deviceName: "PC1", ip: "192.168.1.10", mask: "255.255.255.0" })).toContain("Configurar IP: 192.168.1.10");
  });

  test("executeHostConfig applies configHost", async () => {
    const controller = new FakeHostController();
    const result = await executeHostConfig(controller, { deviceName: "PC1", ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" });
    expect(result.ok).toBe(true);
    expect(controller.configured).toHaveLength(1);
    expect(controller.configured[0]).toEqual({ device: "PC1", payload: { dhcp: false, ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" } });
  });

  test("executeHostInspect maps host state", async () => {
    const controller = new FakeHostController();
    const result = await executeHostInspect(controller, { deviceName: "PC1" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data).toEqual({ name: "PC1", model: "PC-PT", type: "pc", ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1", dns: "8.8.8.8", dhcp: false });
  });

  test("executeHostInspect returns structured not found error", async () => {
    const controller = new FakeHostController();
    const result = await executeHostInspect(controller, { deviceName: "missing" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");
    expect(result.error.code).toBe("HOST_NOT_FOUND");
  });

  test("executeHostHistory maps history result", async () => {
    const controller = new FakeHostController();
    const result = await executeHostHistory(controller, { deviceName: "PC1" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.count).toBe(1);
    expect(result.data.entries[0]?.command).toBe("ipconfig");
  });

  test("executeHostCommand executes host command through terminal service", async () => {
    const controller = new FakeHostController();
    const result = await executeHostCommand(controller, { deviceName: "PC1", command: "ipconfig", timeoutMs: 1000, generateId: () => "test-id" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.device).toBe("PC1");
    expect(result.data.command).toBe("ipconfig");
    expect(result.data.output).toContain("HOST:PC1:ipconfig");
    expect(result.data.success).toBe(true);
  });
});