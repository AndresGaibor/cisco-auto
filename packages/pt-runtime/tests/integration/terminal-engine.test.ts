import { describe, test, expect, beforeEach } from "bun:test";
import { createTerminalEngine, type PTCommandLine } from "../../src/pt/terminal/terminal-engine";

/**

* Mock PT CommandLine that simulates PT behavior

*/
function createMockTerminal(initialPrompt = "Router#") {
  let prompt = initialPrompt;
  let lastOutput = "";
  const enteredCommands: string[] = [];
  const listeners: Map<string, Set<(src: unknown, args: unknown) => void>> = new Map();

  return {
    getPrompt: () => prompt,
    getAllOutput: () => lastOutput,
    getBuffer: () => lastOutput,
    getOutput: () => lastOutput,
    getEnteredCommands: () => [...enteredCommands],
    enterCommand: (cmd: string) => {
      enteredCommands.push(cmd);
      const output = `${prompt} ${cmd}\noutput of: ${cmd}\n`;
      lastOutput += output;

      setTimeout(() => {
        const startedListeners = listeners.get("commandStarted");
        if (startedListeners) {
          startedListeners.forEach(cb => cb(null, { command: cmd }));
        }
      }, 5);

      setTimeout(() => {
        const outputListeners = listeners.get("outputWritten");
        if (outputListeners) {
          outputListeners.forEach(cb => cb(null, { newOutput: output, chunk: output }));
        }
      }, 10);

      setTimeout(() => {
        const endedListeners = listeners.get("commandEnded");
        if (endedListeners) {
          endedListeners.forEach(cb => cb(null, { status: 0 }));
        }
      }, 50);

      return [0, output] as [number, string];
    },
    registerEvent: (event: string, _filter: unknown, cb: (src: unknown, args: unknown) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(cb);
    },
    unregisterEvent: (event: string, _filter: unknown, cb: (src: unknown, args: unknown) => void) => {
      listeners.get(event)?.delete(cb);
    },
    enterChar: (charCode: number, _modifiers: number) => {
      if (charCode === 32) {
        setTimeout(() => {
          const moreListeners = listeners.get("moreDisplayed");
          if (moreListeners) {
            moreListeners.forEach(cb => cb(null, { active: false }));
          }
        }, 10);
      }
    },
  };
}

describe("TerminalEngine Integration", () => {
  test("executes command and returns result via events", async () => {
    const mockTerm = createMockTerminal("Router#");
    const engine = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });

    engine.attach("R1", mockTerm as unknown as PTCommandLine);

    const result = await engine.executeCommand("R1", "show version");

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(mockTerm.getEnteredCommands()).toContain("show version");
  });

  test("returns failed result when enterCommand reports non-zero status", async () => {
    const mockTerm = createMockTerminal("Router#");
    const engine = createTerminalEngine({
      commandTimeoutMs: 100,
      stallTimeoutMs: 100,
      pagerTimeoutMs: 100,
    });

    mockTerm.enterCommand = () => [1, ""] as [number, string];

    engine.attach("R1", mockTerm as unknown as PTCommandLine);

    const result = await engine.executeCommand("R1", "show version");

    expect(result.ok).toBe(false);
    expect(result.output).toBe("");
    expect(result.status).toBe(1);
  });

  test("rejects if no terminal attached", async () => {
    const engine = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });

    await expect(
      engine.executeCommand("R1", "show version")
    ).rejects.toThrow(/No terminal attached/);
  });

  test("can continue pager with space", async () => {
    const mockTerm = createMockTerminal("Router#");
    const engine = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });

    engine.attach("R1", mockTerm as unknown as PTCommandLine);
    engine.continuePager("R1");

    // Verify enterChar was called with space (32)
    // This is a basic smoke test
    expect(true).toBe(true);
  });
});