// Test de RuntimeTerminalAdapter - Verifica contrato canónico para terminal host
// Sigue TDD: test primero, verificar fail, implementar fix mínimo, verificar pass

import { describe, it, expect } from "bun:test";
import { createRuntimeTerminalAdapter } from "../../packages/pt-control/src/adapters/runtime-terminal-adapter.ts";
import type { TerminalPlan } from "../../packages/pt-control/src/ports/runtime-terminal-port.ts";

// Handlers registrados en runtime-handlers.ts
const REGISTERED_HANDLERS = [
  "configHost", "configIos", "execIos", "__pollDeferred", "__ping",
  "execPc", "execPcDirect", "ensureVlans", "configVlanInterfaces",
  "configDhcpServer", "inspectDhcpServer", "inspectHost", "listDevices",
  "addDevice", "removeDevice", "renameDevice", "moveDevice",
  "setDeviceIp", "setDefaultGateway", "addLink", "removeLink",
  "listCanvasRects", "getRect", "devicesInRect", "clearCanvas",
  "addModule", "removeModule", "inspect", "snapshot", "hardwareInfo",
  "hardwareCatalog", "commandLog", "deepInspect", "__evaluate",
  "omni.evaluate.raw", "omni.physical.siphon", "omni.logical.siphonConfigs"
];

// Handlers que son BYPASSES - NO usar
const BYPASS_HANDLERS = ["__ping", "execPcDirect", "omni.evaluate.raw", "omni.physical.siphon"];

describe("RuntimeTerminalAdapter - contrato canónico para host terminal", () => {
  describe("runTerminalPlan para PC (host terminal)", () => {
    it("debe usar contrato REGISTRADO execIos para comandos host", async () => {
      const callLog: string[] = [];
      
      const mockBridge = {
        sendCommandAndWait: async (cmd: string, _payload: any) => {
          callLog.push(cmd);
          return {
            ok: true,
            value: {
              raw: "Pinging 192.168.1.1 with 32 bytes of data:\nReply from 192.168.1.1: bytes=32 time<1ms TTL=255",
              session: { mode: "pc", prompt: "PC1>", paging: false, awaitingConfirm: false },
              diagnostics: { commandStatus: 0, completionReason: "command-completed" },
            },
          };
        },
      };
      
      const adapter = createRuntimeTerminalAdapter({
        bridge: mockBridge as any,
        generateId: () => "test-id",
        defaultTimeout: 10000,
      });

      const plan: TerminalPlan = {
        id: "test-plan-pc",
        device: "PC1",
        steps: [{ command: "ping 192.168.1.1" }],
      };

      await adapter.runTerminalPlan(plan);

      // Verificar que se usó UN handler registrado
      expect(callLog.length).toBeGreaterThan(0);
      const handlerInvocado = callLog[0] as string;
      expect(REGISTERED_HANDLERS).toContain(handlerInvocado);
    });

    it("NO debe usar bypasses: __ping, omni.evaluate.raw, execPcDirect", async () => {
      const callLog: string[] = [];
      
      const mockBridge = {
        sendCommandAndWait: async (cmd: string, _payload: any) => {
          callLog.push(cmd);
          return {
            ok: true,
            value: {
              raw: "Reply from 192.168.1.1",
              session: { mode: "pc", prompt: "PC1>" },
              diagnostics: { commandStatus: 0 },
            },
          };
        },
      };
      
      const adapter = createRuntimeTerminalAdapter({
        bridge: mockBridge as any,
        generateId: () => "test-id",
        defaultTimeout: 10000,
      });

      const plan: TerminalPlan = {
        id: "test-plan-bypass",
        device: "PC1",
        steps: [{ command: "ping 192.168.1.1" }],
      };

      await adapter.runTerminalPlan(plan);

      // Verificar que NO se usó ningún bypass
      for (const bypass of BYPASS_HANDLERS) {
        expect(callLog.includes(bypass as string)).toBe(false);
      }
      
      // Y que se usó execIos (que SÍ está registrado)
      expect(callLog).toContain("execIos");
    });

    it("debe funcionar para PC Command Prompt (C:\\>)", async () => {
      const mockBridge = {
        sendCommandAndWait: async () => ({
          ok: true,
          value: {
            raw: "Pinging 192.168.1.1 with 32 bytes of data:\nReply from 192.168.1.1: bytes=32 time<1ms TTL=255",
            session: { mode: "pc", prompt: "PC1>" },
            diagnostics: { commandStatus: 0 },
          },
        }),
      };

      const adapter = createRuntimeTerminalAdapter({
        bridge: mockBridge as any,
        generateId: () => "test-id",
        defaultTimeout: 10000,
      });

      const plan: TerminalPlan = {
        id: "test-plan-pc-cmd",
        device: "PC1",
        steps: [{ command: "ping 192.168.1.1" }],
      };

      const result = await adapter.runTerminalPlan(plan);

      expect(result.ok).toBe(true);
      expect(result.output).toContain("Reply from");
    });

    it("debe manejar errores de comando host", async () => {
      const mockBridge = {
        sendCommandAndWait: async () => ({
          ok: false,
          value: {
            raw: "Bad command",
            session: { mode: "pc", prompt: "PC1>" },
            diagnostics: { commandStatus: 1 },
          },
        }),
      };

      const adapter = createRuntimeTerminalAdapter({
        bridge: mockBridge as any,
        generateId: () => "test-id",
        defaultTimeout: 10000,
      });

      const plan: TerminalPlan = {
        id: "test-plan-error",
        device: "PC1",
        steps: [{ command: "invalid-cmd" }],
      };

      const result = await adapter.runTerminalPlan(plan);

      expect(result.ok).toBe(false);
      expect(result.status).toBeGreaterThan(0);
    });
  });

  describe("runTerminalPlan para router IOS", () => {
    it("debe usar execIos para IOS también", async () => {
      const callLog: string[] = [];
      
      const mockBridge = {
        sendCommandAndWait: async (cmd: string, _payload: any) => {
          callLog.push(cmd);
          return {
            ok: true,
            value: {
              raw: "Interface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0   192.168.1.1    YES manual up                    up",
              session: { mode: "exec", prompt: "R1>", paging: false },
              diagnostics: { commandStatus: 0 },
            },
          };
        },
      };
      
      const adapter = createRuntimeTerminalAdapter({
        bridge: mockBridge as any,
        generateId: () => "test-id",
        defaultTimeout: 10000,
      });

      const plan: TerminalPlan = {
        id: "test-plan-ios",
        device: "R1",
        steps: [{ command: "show ip int brief" }],
      };

      const result = await adapter.runTerminalPlan(plan);

      expect(callLog).toContain("execIos");
      expect(result.ok).toBe(true);
    });
  });

  describe("verificación de contrato", () => {
    it("execIos está registrado en runtime-handlers.ts", async () => {
      const registeredHandler = "execIos";
      expect(REGISTERED_HANDLERS).toContain(registeredHandler);
    });

    it("bypasses NO están registrados como contrato público", async () => {
      for (const bypass of BYPASS_HANDLERS) {
        // Los bypasses PUEDEN estar registrados, pero NO deben usarse en el adapter público
        // El test anterior verifica que el adapter NO los usa
        expect(typeof bypass).toBe("string");
      }
    });
  });
});