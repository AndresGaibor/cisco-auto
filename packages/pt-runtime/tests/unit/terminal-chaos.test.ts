import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCommandExecutor } from "../../src/terminal/command-executor";
import { createTerminalSessionState } from "../../src/terminal/session-state";
import { TerminalErrors } from "../../src/terminal/terminal-errors";

// Mock del kernel de PT
const mockIpc = {
  network: () => ({
    getDevice: (name: string) => ({
      getPower: () => mockPowerState[name] ?? true,
      getName: () => name,
    })
  })
};

let mockPowerState: Record<string, boolean> = {};

// Helper para crear una terminal mock
function createMockTerminal(initialPrompt: string) {
  const listeners: Record<string, Function> = {};
  let currentPrompt = initialPrompt;
  let output = "";

  return {
    getPrompt: () => currentPrompt,
    getOutput: () => output,
    setPrompt: (p: string) => { currentPrompt = p; },
    appendOutput: (t: string) => { output += t; },
    enterCommand: vi.fn(),
    enterChar: vi.fn(),
    registerEvent: (name: string, ctx: any, handler: Function) => {
      listeners[name] = handler;
    },
    unregisterEvent: vi.fn(),
    triggerEvent: (name: string, args: any) => {
      if (listeners[name]) {
          listeners[name](null, args);
      }
    }
  };
}

describe("CommandExecutor - Heurísticas (Fase 4 Verification)", () => {
  
  beforeEach(() => {
    mockPowerState = {};
    global.ipc = mockIpc as any;
    global.ensureSession = (name: string) => {
        const s = createTerminalSessionState(name);
        // Forzamos el tipo según el prompt inicial si es posible
        if (name.includes("PC")) s.sessionKind = "host";
        if (name.includes("R")) s.sessionKind = "ios";
        return s;
    };
  });

  describe("H1: Estabilización de Output (PC)", () => {
    it("debe finalizar PCs por prompt + estabilidad incluso sin commandEnded", async () => {
      const executor = createCommandExecutor();
      const terminal = createMockTerminal("PC>");
      
      const promise = executor.executeCommand("PC1", "dir", terminal as any);
      terminal.triggerEvent("commandStarted", {});
      
      terminal.setPrompt("PC>");
      terminal.triggerEvent("promptChanged", { prompt: "PC>" });
      terminal.triggerEvent("outputWritten", { chunk: "File1.txt" });

      // Esperar tiempo de estabilidad
      await new Promise(r => setTimeout(r, 600));
      
      const result = await promise;
      expect(result.ok).toBe(true);
      expect(result.output).toContain("File1.txt");
    });
  });

  describe("H2: DNS Recovery (IOS)", () => {
    it("debe detectar el hangup y permitir la recuperación", async () => {
      const executor = createCommandExecutor();
      const terminal = createMockTerminal("Router>");
      
      const promise = executor.executeCommand("R1", "bad_cmd", terminal as any);
      terminal.triggerEvent("commandStarted", {});

      const hang = 'Translating "bad_cmd"...domain server';
      terminal.triggerEvent("outputWritten", { chunk: hang });

      expect(terminal.enterChar).toHaveBeenCalledWith(3, 0); // Ctrl+C
      
      // Simular que PT dispara el fin del comando tras el break
      terminal.setPrompt("Router>");
      terminal.triggerEvent("promptChanged", { prompt: "Router>" });
      terminal.triggerEvent("commandEnded", { status: 1 });

      const result = await promise;
      expect(result.ok).toBe(false); // bad_cmd falló/fue cancelado
      expect(result.status).toBe(1);
      expect(result.warnings.some(w => w.includes("DNS"))).toBe(true);
    });
  });

  describe("H5: Sanitización Avanzada", () => {
    it("debe limpiar el output final combinando buffer de eventos y baseline", async () => {
      const executor = createCommandExecutor();
      const terminal = createMockTerminal("PC>");
      
      const promise = executor.executeCommand("PC1", "echo", terminal as any);
      terminal.triggerEvent("commandStarted", {});
      
      // Simular output con "ruido" de retroceso
      const noisy = "A\x08BC"; // A + backspace + BC -> BC
      terminal.appendOutput(noisy);
      terminal.triggerEvent("outputWritten", { chunk: noisy });
      
      terminal.setPrompt("PC>");
      terminal.triggerEvent("promptChanged", { prompt: "PC>" });

      await new Promise(r => setTimeout(r, 600));
      const result = await promise;
      expect(result.output).toBe("BC");
    });
  });

  describe("Fase 5: Persistencia del Historial", () => {
    it("debe acumular comandos en el historial a través de múltiples ejecuciones", async () => {
      const executor = createCommandExecutor();
      const terminal = createMockTerminal("PC>");
      
      // Comando 1
      const p1 = executor.executeCommand("PC-HIST", "ipconfig", terminal as any);
      terminal.triggerEvent("commandStarted", {});
      terminal.appendOutput("IP: 1.1.1.1");
      terminal.triggerEvent("outputWritten", { chunk: "IP: 1.1.1.1" });
      terminal.setPrompt("PC>");
      terminal.triggerEvent("promptChanged", { prompt: "PC>" });
      await new Promise(r => setTimeout(r, 600));
      await p1;

      // Comando 2
      const p2 = executor.executeCommand("PC-HIST", "ping 8.8.8.8", terminal as any);
      terminal.triggerEvent("commandStarted", {});
      terminal.appendOutput("Pinging...");
      terminal.triggerEvent("outputWritten", { chunk: "Pinging..." });
      terminal.setPrompt("PC>");
      terminal.triggerEvent("promptChanged", { prompt: "PC>" });
      await new Promise(r => setTimeout(r, 600));
      await p2;

      // Verificar historial (obtenido de una 3ra llamada o inspeccionando la sesión si tuviéramos acceso, 
      // pero el resultado de executeCommand ya trae el estado final del executor)
      // En nuestro CommandExecutor, finalize actualiza la sesión y devuelve los datos.
      
      // Para verificar persistencia real, necesitamos acceder al registry
      const { ensureSession } = await import("../../src/terminal/session-registry");
      const session = ensureSession("PC-HIST");
      
      expect(session.history.length).toBe(2);
      expect(session.history[0].command).toBe("ipconfig");
      expect(session.history[1].command).toBe("ping 8.8.8.8");
    });
  });
});
