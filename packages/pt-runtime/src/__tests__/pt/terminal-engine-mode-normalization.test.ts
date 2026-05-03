import { describe, expect, test, vi } from "bun:test";
import { createTerminalEngine } from "../../pt/terminal/terminal-engine.js";

function createMockTerminal(prompt: string, mode = "") {
  return {
    getPrompt: vi.fn(() => prompt),
    getMode: vi.fn(() => mode),
    enterCommand: vi.fn(),
    enterChar: vi.fn(),
    registerEvent: vi.fn(),
    unregisterEvent: vi.fn(),
  };
}

describe("TerminalEngine mode normalization", () => {
  test.each([
    ["SW1(config)#", "global-config"],
    ["SW1(config-if)#", "config-if"],
    ["SW1(config-if-range)#", "config-if-range"],
    ["SW1(config-router)#", "config-router"],
    ["SW1(config-line)#", "config-line"],
    ["SW1(config-vlan)#", "config-vlan"],
    ["SW1(config-subif)#", "config-subif"],
    ["SW1#", "privileged-exec"],
    ["SW1>", "user-exec"],
  ])("preserva modo %s como %s al hacer attach", (prompt, expectedMode) => {
    const engine = createTerminalEngine({
      commandTimeoutMs: 1000,
      stallTimeoutMs: 1000,
      pagerTimeoutMs: 1000,
    });

    engine.attach("SW1", createMockTerminal(prompt) as never);

    expect(engine.getSession("SW1")).toMatchObject({
      prompt,
      mode: expectedMode,
    });
  });

  test("el prompt tiene prioridad sobre un getMode genérico de Packet Tracer", () => {
    const engine = createTerminalEngine({
      commandTimeoutMs: 1000,
      stallTimeoutMs: 1000,
      pagerTimeoutMs: 1000,
    });

    engine.attach("SW1", createMockTerminal("SW1(config-if)#", "config") as never);

    expect(engine.getSession("SW1")).toMatchObject({
      prompt: "SW1(config-if)#",
      mode: "config-if",
    });
  });
});
