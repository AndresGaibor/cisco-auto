import { describe, expect, test } from "bun:test";
import { IosService } from "./ios-service.js";

describe("IosService show", () => {
  test("devuelve salida estructurada para show ip interface brief", async () => {
    const bridge = {
      sendCommandAndWait: async () => ({
        ok: true,
        value: {
          raw: "show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nGigabitEthernet0/0     unassigned      YES unset  administratively down down \nGigabitEthernet0/1     unassigned      YES unset  administratively down down \nRouter#",
          status: 0,
          source: "terminal",
        },
      }),
    };

    const service = new IosService(bridge as any, () => "test-id", async () => ({
      model: "2911",
      name: "R1",
    } as any));

    const result = await service.showIpInterfaceBrief("R1");

    expect(result.raw).toContain("show ip interface brief");
    expect(result.interfaces.length).toBeGreaterThan(0);
    expect(result.interfaces[0]?.interface).toBe("GigabitEthernet0/0");
  });

  test("expone evidencia estructurada en execIos", async () => {
    const bridge = {
      sendCommandAndWait: async () => ({
        ok: true,
        value: {
          raw: "show version\nRouter#",
          status: 0,
          source: "terminal",
          session: { mode: "privileged-exec", prompt: "Router#", paging: false, awaitingConfirm: false },
          diagnostics: { source: "terminal", completionReason: "command-ended" },
        },
      }),
    };

    const service = new IosService(bridge as any, () => "test-id", async () => ({
      model: "2911",
      name: "R1",
    } as any));

    const result = await service.execIos("R1", "show version");

    expect(result.ok).toBe(true);
    expect(result.evidence.source).toBe("terminal");
    expect(result.evidence.status).toBe(0);
    expect(result.evidence.mode).toBe("privileged-exec");
    expect(result.evidence.prompt).toBe("Router#");
    expect(result.evidence.paging).toBe(false);
    expect(result.evidence.awaitingConfirm).toBe(false);
  });

  test("devuelve rutas reales para show ip route", async () => {
    const bridge = {
      sendCommandAndWait: async () => ({
        ok: true,
        value: {
          raw: "show ip route\nCodes: C - connected, S - static\nGateway of last resort is not set\n\nC    192.168.1.0/24 is directly connected, GigabitEthernet0/0\nRouter#",
          status: 0,
          source: "terminal",
        },
      }),
    };

    const service = new IosService(bridge as any, () => "test-id", async () => ({
      model: "2911",
      name: "R1",
    } as any));

    const result = await service.showIpRoute("R1");

    expect(result.raw).toContain("show ip route");
    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.routes[0]?.network).toBe("192.168.1.0/24");
  });

  test("devuelve metadata util para show running-config", async () => {
    const bridge = {
      sendCommandAndWait: async () => ({
        ok: true,
        value: {
          raw: "show running-config\nBuilding configuration...\n\nCurrent configuration : 693 bytes\n!\nversion 15.1\nhostname Router\n!\ninterface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0\n!\nRouter#",
          status: 0,
          source: "terminal",
        },
      }),
    };

    const service = new IosService(bridge as any, () => "test-id", async () => ({
      model: "2911",
      name: "R1",
    } as any));

    const result = await service.showRunningConfig("R1");

    expect(result.raw).toContain("show running-config");
    expect(result.hostname).toBe("Router");
    expect(result.version).toBe("15.1");
    expect(result.sections?.length).toBeGreaterThan(0);
    expect(result.interfaces?.["GigabitEthernet0/0"]).toContain("ip address");
    expect(result.lines?.length).toBeGreaterThan(0);
  });
});
