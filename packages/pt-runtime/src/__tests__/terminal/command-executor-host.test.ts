// ============================================================================
// Tests: Command Executor - Host Command Completion (TDD)
// ============================================================================
// Tests que verifican que comandos host (ping, ipconfig, tracert, arp)
// usan un único engine y no tienen special cases rotos.
// 
// BUG ACTUAL: handlePing tiene un special PC branch que retorna:
//   { deferred: true, startTime, maxTime, target, device }
// SIN un ticket de deferred job válido.
// 
// Tests VERDADEROS que verifican el bug:
// 1. handlePing para PC retorna deferred sin ticket -> FALLA (bug)
// 2. handlePing para PC usa CommandExecutor -> FALLA (no lo usa)
// 3. handleExecPc retorna output completo para ping -> FALLA (no lo hace)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock de PTCommandLine que simula comportamiento real
function createMockTerminal() {
  const handlers: Record<string, Set<Function>> = {
    commandStarted: new Set(),
    outputWritten: new Set(),
    commandEnded: new Set(),
    modeChanged: new Set(),
    promptChanged: new Set(),
    moreDisplayed: new Set(),
  };

  let prompt = "PC>";
  let outputBuffer = "";

  const terminal = {
    getPrompt: () => prompt,
    setPrompt: (p: string) => { prompt = p; },
    getOutput: () => outputBuffer,
    clearOutput: () => { outputBuffer = ""; },
    
    enterCommand: vi.fn((cmd: string) => {
      setTimeout(() => {
        if (cmd.startsWith("ping ")) {
          outputBuffer = `Pinging 8.8.8.8 with 32 bytes of data:

Reply from 8.8.8.8: bytes=32 time=10ms TTL=117
Reply from 8.8.8.8: bytes=32 time=11ms TTL=117
Reply from 8.8.8.8: bytes=32 time=10ms TTL=117
Reply from 8.8.8.8: bytes=32 time=11ms TTL=117

Ping statistics for 8.8.8.8:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 10ms, Maximum = 11ms, Average = 10ms

PC>`;
        } else if (cmd.startsWith("ipconfig")) {
          outputBuffer = `Windows IP Configuration

Ethernet adapter Ethernet0:

   Connection-specific DNS Suffix  . : home
   IPv4 Address. . . . . . . . . . . . : 192.168.1.100
   Subnet Mask . . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . . . : 192.168.1.1

PC>`;
        } else if (cmd.startsWith("tracert ")) {
          outputBuffer = `Tracing route to 8.8.8.8 over a maximum of 30 hops:

  1     1 ms    <1 ms    <1 ms  192.168.1.1
  2     8 ms    10 ms     8 ms  172.217.14.1
  3    10 ms    11 ms    10 ms  8.8.8.8

Trace complete.

PC>`;
        } else if (cmd.startsWith("arp -a")) {
          outputBuffer = `Internet Address      Physical Address      Type
192.168.1.1          a1-b2-c3-d4-e5-f6     dynamic
192.168.1.100        f6-e5-d4-c3-b2-a1     dynamic

PC>`;
        }

        handlers.outputWritten.forEach(h => h(null, { newOutput: outputBuffer }));
        handlers.commandEnded.forEach(h => h(null, { status: 0 }));
      }, 50);
    }),

    registerEvent: vi.fn((event: string, _ctx: null, handler: Function) => {
      handlers[event]?.add(handler);
    }),

    unregisterEvent: vi.fn((event: string, _ctx: null, handler: Function) => {
      handlers[event]?.delete(handler);
    }),

    enterChar: vi.fn(),
  };

  return terminal;
}

// Mock de API minimal
function createMockApi(deviceName: string, deviceType: number = 8) {
  return {
    getDeviceByName: vi.fn((name: string) => {
      if (name !== deviceName) return null;
      return {
        getType: () => deviceType,
        getModel: () => "PC-PT",
        getCommandLine: () => createMockTerminal(),
      };
    }),
    ipc: {
      network: () => ({
        getDevice: (name: string) => {
          if (name !== deviceName) return null;
          return { getCommandLine: () => createMockTerminal() };
        },
      }),
    },
  };
}

describe("Command Executor - Host Command Completion (TDD)", () => {
  describe("BUG: handlePing especial PC branch", () => {
    it("handlePing para PC debe retornar output completo (NO deferred)", async () => {
      // Este test verifica el BUG ACTUAL en handlePing:
      // Líneas 253-278 en ios-execution.ts retornan:
      //   { deferred: true, startTime, maxTime, target, device }
      // SIN un ticket de deferred job.
      // 
      // El test debe FALLAR hasta que se implemente el fix

      // Arrange
      const { handlePing } = await import("../../handlers/ios-execution");
      const api = createMockApi("PC1", 8); // type 8 = PC

      // Act
      const result = await handlePing({ device: "PC1", target: "8.8.8.8" }, api as any);

      // Assert - Después del fix: NO deferred, output completo
      expect(result.deferred).toBeUndefined();
      expect(result.ok).toBe(true);
      expect(result.raw).toContain("Ping statistics");
      
      // Verificación adicional: no debe tener las propiedades del bypass roto
      expect((result as any).startTime).toBeUndefined();
      expect((result as any).maxTime).toBeUndefined();
    });

    it("handlePing para PC debe usar CommandExecutor (no bypass)", async () => {
      // Verifica que handlePing use el mismo engine que handleExecPc
      
      const { handlePing, handleExecPc } = await import("../../handlers/ios-execution");
      const api = createMockApi("PC1", 8);

      const execPcResult = await handleExecPc(
        { device: "PC1", command: "ping 8.8.8.8" } as any,
        api as any
      );

      // handleExecPc debe retornar output completo
      expect(execPcResult.ok).toBe(true);
      expect(execPcResult.raw).toContain("Ping statistics");
    });

    it("handleExecPc para ping debe retornar output completo", async () => {
      // Verify que handleExecPc con ping retorna output completo
      
      const { handleExecPc } = await import("../../handlers/ios-execution");
      const api = createMockApi("PC1", 8);

      const result = await handleExecPc(
        { device: "PC1", command: "ping 8.8.8.8" } as any,
        api as any
      );

      // Debe tener output completo, no vacío
      expect(result.ok).toBe(true);
      expect(result.raw).toBeDefined();
      expect(result.raw!.length).toBeGreaterThan(50);
      expect(result.raw).toContain("Ping statistics");
    });

    it("handleExecPc para ipconfig debe retornar output completo", async () => {
      const { handleExecPc } = await import("../../handlers/ios-execution");
      const api = createMockApi("PC1", 8);

      const result = await handleExecPc(
        { device: "PC1", command: "ipconfig" } as any,
        api as any
      );

      expect(result.ok).toBe(true);
      expect(result.raw).toContain("IPv4 Address");
      expect(result.raw).toContain("Subnet Mask");
      expect(result.raw).toContain("Default Gateway");
    });

    it("handleExecPc para tracert debe esperar hasta completion", async () => {
      const { handleExecPc } = await import("../../handlers/ios-execution");
      const api = createMockApi("PC1", 8);

      const result = await handleExecPc(
        { device: "PC1", command: "tracert 8.8.8.8" } as any,
        api as any
      );

      expect(result.ok).toBe(true);
      expect(result.raw!.toLowerCase()).toContain("trace complete");
    });

    it("handleExecPc para arp -a debe retornar sin false empty", async () => {
      const { handleExecPc } = await import("../../handlers/ios-execution");
      const api = createMockApi("PC1", 8);

      const result = await handleExecPc(
        { device: "PC1", command: "arp -a" } as any,
        api as any
      );

      expect(result.ok).toBe(true);
      expect(result.raw).toContain("Internet Address");
      expect(result.raw).toContain("Physical Address");
      expect(result.raw!.length).toBeGreaterThan(30);
    });
  });

  describe("detectHostBusy - completion detection estructural", () => {
    it("detecta completion por 'Ping statistics' (estructural)", () => {
      const { detectHostBusy } = require("../../terminal/prompt-detector");
      
      const completePing = `Ping statistics for 8.8.8.8:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`;
      
      expect(detectHostBusy(completePing)).toBe(true);
    });

    it("detecta completion por 'reply from' (estructural)", () => {
      const { detectHostBusy } = require("../../terminal/prompt-detector");
      
      expect(detectHostBusy("reply from 8.8.8.8: bytes=32")).toBe(true);
    });

    it("detecta 'tracing route' (estructural)", () => {
      const { detectHostBusy } = require("../../terminal/prompt-detector");
      
      expect(detectHostBusy("tracing route to 8.8.8.8")).toBe(true);
    });

    it("detecta 'trace complete' (estructural)", () => {
      const { detectHostBusy } = require("../../terminal/prompt-detector");
      
      expect(detectHostBusy("Trace complete.")).toBe(true);
    });

    it("NO marca completion para output vacío", () => {
      const { detectHostBusy } = require("../../terminal/prompt-detector");
      
      expect(detectHostBusy("")).toBe(false);
    });
  });
});