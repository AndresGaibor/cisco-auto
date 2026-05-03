import { describe, expect, test } from "bun:test";
import {
  executeCompleteShowInterfaces,
  extractInterfaceShowBlock,
  isCompleteShowInterfacesRequest,
  parseInterfacesFromIpInterfaceBrief,
  parseInterfacesFromRunningConfig,
} from "./interfaces-complete.js";

describe("interfaces-complete", () => {
  test("detecta variantes globales soportadas de show interfaces", () => {
    expect(isCompleteShowInterfacesRequest("show interfaces")).toBe(true);
    expect(isCompleteShowInterfacesRequest("show interface")).toBe(true);
    expect(isCompleteShowInterfacesRequest("SHOW INTERFACES")).toBe(true);
    expect(isCompleteShowInterfacesRequest(" show   interfaces ")).toBe(true);
    expect(isCompleteShowInterfacesRequest("\tshow\tinterface\n")).toBe(true);
  });

  test("rechaza --complete para comandos filtrados o distintos a show interfaces global", () => {
    expect(isCompleteShowInterfacesRequest("show interfaces FastEthernet0/1")).toBe(false);
    expect(isCompleteShowInterfacesRequest("show interface FastEthernet0/1")).toBe(false);
    expect(isCompleteShowInterfacesRequest("show interfaces status")).toBe(false);
    expect(isCompleteShowInterfacesRequest("show ip interface brief")).toBe(false);
    expect(isCompleteShowInterfacesRequest("show ip interfaces")).toBe(false);
    expect(isCompleteShowInterfacesRequest("show running-config")).toBe(false);
    expect(isCompleteShowInterfacesRequest("")).toBe(false);
  });

  test("parsea interfaces desde running-config preservando orden", () => {
    expect(
      parseInterfacesFromRunningConfig([
        "interface FastEthernet0/1",
        " switchport mode access",
        "!",
        "interface FastEthernet0/24",
        "!",
        "interface GigabitEthernet0/1",
        "!",
        "interface Vlan99",
      ].join("\n")),
    ).toEqual([
      "FastEthernet0/1",
      "FastEthernet0/24",
      "GigabitEthernet0/1",
      "Vlan99",
    ]);
  });

  test("parsea interfaces desde show ip interface brief", () => {
    expect(
      parseInterfacesFromIpInterfaceBrief([
        "Interface              IP-Address      OK? Method Status                Protocol",
        "FastEthernet0/1        unassigned      YES manual up                    up",
        "GigabitEthernet0/1     unassigned      YES manual up                    up",
        "Vlan99                 192.168.99.6    YES manual up                    up",
      ].join("\n")),
    ).toEqual([
      "FastEthernet0/1",
      "GigabitEthernet0/1",
      "Vlan99",
    ]);
  });

  test("ejecuta show interfaces por partes y une bloques completos", async () => {
    const calls: string[] = [];

    const result = await executeCompleteShowInterfaces({
      device: "SW1",
      execute: async (command) => {
        calls.push(command);

        if (command === "show ip interface brief") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: [
              "Interface              IP-Address      OK? Method Status                Protocol",
              "FastEthernet0/1        unassigned      YES manual up                    up",
              "GigabitEthernet0/1     unassigned      YES manual up                    up",
            ].join("\n"),
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        return {
          ok: true,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: `${command.replace("show interfaces ", "")} is up, line protocol is up`,
          rawOutput: "",
          status: 0,
          warnings: [],
        } as any;
      },
    });

    expect(calls).toEqual([
      "show ip interface brief",
      "show interfaces FastEthernet0/1",
      "show interfaces GigabitEthernet0/1",
    ]);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("FastEthernet0/1 is up");
    expect(result.output).toContain("GigabitEthernet0/1 is up");
    expect(result.evidence?.completeInterfaces?.interfaces).toEqual([
      "FastEthernet0/1",
      "GigabitEthernet0/1",
    ]);
    expect(result.evidence?.completeInterfaces?.succeeded).toEqual([
      "FastEthernet0/1",
      "GigabitEthernet0/1",
    ]);
    expect(result.evidence?.completeInterfaces?.failed).toEqual([]);
  });

  test("conserva éxito parcial si una interfaz falla", async () => {
    const result = await executeCompleteShowInterfaces({
      device: "SW1",
      execute: async (command) => {
        if (command === "show ip interface brief") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: "Interface              IP-Address      OK? Method Status                Protocol\nFastEthernet0/1        unassigned      YES manual up                    up\nFastEthernet0/2        unassigned      YES manual up                    up",
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        if (command.endsWith("FastEthernet0/2")) {
          return {
            ok: false,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: "bad",
            rawOutput: "bad",
            status: 1,
            warnings: [],
            error: {
              code: "IOS_EXEC_FAILED",
              message: "bad",
              phase: "execution",
            },
          } as any;
        }

        return {
          ok: true,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: "FastEthernet0/1 is up",
          rawOutput: "",
          status: 0,
          warnings: [],
        } as any;
      },
    });

    expect(result.ok).toBe(true);
    expect(result.evidence?.completeInterfaces?.succeeded).toEqual(["FastEthernet0/1"]);
    expect(result.evidence?.completeInterfaces?.failed).toEqual([
      {
        interface: "FastEthernet0/2",
        command: "show interfaces FastEthernet0/2",
        code: "IOS_EXEC_FAILED",
        message: "bad",
        status: 1,
      },
    ]);
    expect(result.warnings).toContain("1 interfaz(es) no pudieron recolectarse en modo completo.");
  });

  test("extrae solo el bloque de la interfaz solicitada desde output contaminado", () => {
    const output = [
      "Last clearing of \"show interface\" counters never",
      "GigabitEthernet0/1 is up, line protocol is up (connected)",
      "  Hardware is Lance",
      "SW-SRV-DIST#show running-config",
      "Building configuration...",
      "interface FastEthernet0/1",
      "!",
      "SW-SRV-DIST#show interfaces FastEthernet0/1",
      "FastEthernet0/1 is up, line protocol is up (connected)",
      "  Hardware is Lance, address is 0060.5c93.4501",
      "  Keepalive set (10 sec)",
      "SW-SRV-DIST#",
      "SW-SRV-DIST#show interfaces FastEthernet0/2",
      "FastEthernet0/2 is up, line protocol is up (connected)",
    ].join("\n");

    expect(extractInterfaceShowBlock(output, "FastEthernet0/1")).toBe(
      [
        "FastEthernet0/1 is up, line protocol is up (connected)",
        "  Hardware is Lance, address is 0060.5c93.4501",
        "  Keepalive set (10 sec)",
      ].join("\n"),
    );
  });

  test("retorna null si la salida no contiene header limpio de la interfaz solicitada", () => {
    const output = [
      "Keepalive set (10 sec)",
      "Last clearing of \"show interface\" counters never",
      "SW-SRV-DIST#show interfaces FastEthernet0/22",
      "FastEthernet0/22 is down, line protocol is down (disabled)",
    ].join("\n");

    expect(extractInterfaceShowBlock(output, "FastEthernet0/1")).toBeNull();
  });

  test("executeCompleteShowInterfaces no concatena historial contaminado", async () => {
    const result = await executeCompleteShowInterfaces({
      device: "SW1",
      execute: async (command) => {
        if (command === "show ip interface brief") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: "Interface              IP-Address      OK? Method Status                Protocol\nFastEthernet0/1        unassigned      YES manual up                    up\nFastEthernet0/2        unassigned      YES manual up                    up",
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        if (command === "show interfaces FastEthernet0/1") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: [
              "show running-config",
              "interface FastEthernet0/1",
              "!",
              "SW1#show interfaces FastEthernet0/1",
              "FastEthernet0/1 is up, line protocol is up (connected)",
              "  Hardware is Lance",
              "SW1#",
            ].join("\n"),
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        return {
          ok: true,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: [
            "tail from previous command",
            "SW1#show interfaces FastEthernet0/2",
            "FastEthernet0/2 is down, line protocol is down (disabled)",
            "  Hardware is Lance",
            "SW1#",
          ].join("\n"),
          rawOutput: "",
          status: 0,
          warnings: [],
        } as any;
      },
    });

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      [
        "FastEthernet0/1 is up, line protocol is up (connected)",
        "  Hardware is Lance",
        "",
        "FastEthernet0/2 is down, line protocol is down (disabled)",
        "  Hardware is Lance",
      ].join("\n"),
    );
    expect(result.output).not.toContain("show running-config");
    expect(result.output).not.toContain("interface FastEthernet0/1\n!");
    expect(result.output).not.toContain("tail from previous command");
    expect(result.evidence?.completeInterfaces?.failed).toEqual([]);
  });

  test("executeCompleteShowInterfaces marca failed si una interfaz ok:true no trae bloque limpio", async () => {
    const result = await executeCompleteShowInterfaces({
      device: "SW1",
      execute: async (command) => {
        if (command === "show ip interface brief") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: "Interface              IP-Address      OK? Method Status                Protocol\nFastEthernet0/1        unassigned      YES manual up                    up\nFastEthernet0/2        unassigned      YES manual up                    up",
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        if (command === "show interfaces FastEthernet0/1") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: "FastEthernet0/1 is up, line protocol is up (connected)",
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        return {
          ok: true,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: "Keepalive set (10 sec)\nSW1#",
          rawOutput: "",
          status: 0,
          warnings: [],
        } as any;
      },
    });

    expect(result.ok).toBe(true);
    expect(result.output).toContain("FastEthernet0/1 is up");
    expect(result.output).not.toContain("Keepalive set");
    expect(result.evidence?.completeInterfaces?.succeeded).toEqual(["FastEthernet0/1"]);
    expect(result.evidence?.completeInterfaces?.failed).toEqual([
      {
        interface: "FastEthernet0/2",
        command: "show interfaces FastEthernet0/2",
        code: "IOS_INTERFACE_BLOCK_NOT_FOUND",
        message:
          'La salida de "show interfaces FastEthernet0/2" no contiene un bloque limpio que empiece con "FastEthernet0/2 is ...".',
        status: 0,
      },
    ]);
  });

  test("usa running-config como fallback solo si show ip interface brief no lista interfaces", async () => {
    const calls: string[] = [];

    const result = await executeCompleteShowInterfaces({
      device: "SW1",
      execute: async (command) => {
        calls.push(command);

        if (command === "show ip interface brief") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: "Interface              IP-Address      OK? Method Status                Protocol",
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        if (command === "show running-config") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: "interface FastEthernet0/1\n!\ninterface Vlan99",
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        return {
          ok: true,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: `${command.replace("show interfaces ", "")} is up, line protocol is up`,
          rawOutput: "",
          status: 0,
          warnings: [],
        } as any;
      },
    });

    expect(calls).toEqual([
      "show ip interface brief",
      "show running-config",
      "show interfaces FastEthernet0/1",
      "show interfaces Vlan99",
    ]);
    expect(result.ok).toBe(true);
    expect(result.evidence?.completeInterfaces?.discoveryCommand).toBe("show running-config");
  });

  test("no ejecuta running-config si show ip interface brief falla", async () => {
    const calls: string[] = [];

    const result = await executeCompleteShowInterfaces({
      device: "SW1",
      execute: async (command) => {
        calls.push(command);

        return {
          ok: false,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: "",
          rawOutput: "",
          status: 1,
          warnings: ["timeout"],
          error: {
            code: "JOB_TIMEOUT",
            message: "timeout",
            phase: "execution",
          },
        } as any;
      },
    });

    expect(calls).toEqual(["show ip interface brief"]);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("JOB_TIMEOUT");
    expect(result.evidence?.completeInterfaces?.discoveryCommand).toBe("show ip interface brief");
  });

  test("reintenta una interfaz cuando ok:true no contiene bloque limpio", async () => {
    const calls: string[] = [];
    let fa22Attempts = 0;

    const result = await executeCompleteShowInterfaces({
      device: "SW1",
      settleDelayMs: 0,
      blockRetryDelayMs: 0,
      blockRetryCount: 2,
      execute: async (command) => {
        calls.push(command);

        if (command === "show ip interface brief") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: [
              "Interface              IP-Address      OK? Method Status                Protocol",
              "FastEthernet0/22       unassigned      YES manual down                  down",
            ].join("\n"),
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        fa22Attempts += 1;

        if (fa22Attempts === 1) {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: "FastEthernet0/21 is down, line protocol is down (disabled)",
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        return {
          ok: true,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: "FastEthernet0/22 is down, line protocol is down (disabled)\n  Hardware is Lance",
          rawOutput: "",
          status: 0,
          warnings: [],
        } as any;
      },
    });

    expect(result.ok).toBe(true);
    expect(fa22Attempts).toBe(2);
    expect(calls).toEqual([
      "show ip interface brief",
      "show interfaces FastEthernet0/22",
      "show interfaces FastEthernet0/22",
    ]);
    expect(result.output).toContain("FastEthernet0/22 is down");
    expect(result.evidence?.completeInterfaces?.succeeded).toEqual(["FastEthernet0/22"]);
    expect(result.evidence?.completeInterfaces?.failed).toEqual([]);
    expect(result.evidence?.completeInterfaces?.retryCount).toBe(1);
  });

  test("marca failed después de agotar retries de bloque limpio", async () => {
    let attempts = 0;

    const result = await executeCompleteShowInterfaces({
      device: "SW1",
      settleDelayMs: 0,
      blockRetryDelayMs: 0,
      blockRetryCount: 2,
      execute: async (command) => {
        if (command === "show ip interface brief") {
          return {
            ok: true,
            action: "ios.exec",
            device: "SW1",
            deviceKind: "ios",
            command,
            output: [
              "Interface              IP-Address      OK? Method Status                Protocol",
              "GigabitEthernet0/1     unassigned      YES manual up                    up",
            ].join("\n"),
            rawOutput: "",
            status: 0,
            warnings: [],
          } as any;
        }

        attempts += 1;

        return {
          ok: true,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: "FastEthernet0/21 is down, line protocol is down (disabled)",
          rawOutput: "",
          status: 0,
          warnings: [],
        } as any;
      },
    });

    expect(result.ok).toBe(false);
    expect(attempts).toBe(3);
    expect(result.evidence?.completeInterfaces?.retryCount).toBe(2);
    expect(result.evidence?.completeInterfaces?.failed).toEqual([
      {
        interface: "GigabitEthernet0/1",
        command: "show interfaces GigabitEthernet0/1",
        code: "IOS_INTERFACE_BLOCK_NOT_FOUND",
        message:
          'La salida de "show interfaces GigabitEthernet0/1" no contiene un bloque limpio que empiece con "GigabitEthernet0/1 is ...".',
        status: 0,
      },
    ]);
  });
});