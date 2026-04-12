import { describe, test, expect, beforeEach, vi } from "bun:test";
import { createTerminalEngine, type PTCommandLine } from "../../pt/terminal/terminal-engine";
import { parsePrompt, canExecuteCommand, isConfirmPrompt, isErrorOutput } from "../../pt/terminal/prompt-parser";

describe("createTerminalEngine", () => {
  let mockTerm: PTCommandLine;
  let engine: ReturnType<typeof createTerminalEngine>;

  beforeEach(() => {
    mockTerm = {
      getPrompt: vi.fn(() => "Router#"),
      enterCommand: vi.fn(),
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterChar: vi.fn(),
    };

    engine = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });
  });

  test("attach creates session", () => {
    engine.attach("R1", mockTerm);
    expect(engine.getSession("R1")).not.toBeNull();
  });

  test("detach removes session", () => {
    engine.attach("R1", mockTerm);
    engine.detach("R1");
    expect(engine.getSession("R1")).toBeNull();
  });

  test("getMode returns current mode", () => {
    engine.attach("R1", mockTerm);
    expect(engine.getMode("R1")).toBe("unknown");
  });

  test("isBusy returns false when idle", () => {
    engine.attach("R1", mockTerm);
    expect(engine.isBusy("R1")).toBe(false);
  });

  test("getSession returns null for unknown device", () => {
    expect(engine.getSession("UNKNOWN")).toBeNull();
  });
});

describe("parsePrompt", () => {
  test("parses privileged exec mode", () => {
    const result = parsePrompt("Router#");
    expect(result.mode).toBe("privileged-exec");
    expect(result.hostname).toBe("Router");
  });

  test("parses user exec mode", () => {
    const result = parsePrompt("Router>");
    expect(result.mode).toBe("user-exec");
    expect(result.hostname).toBe("Router");
  });

  test("parses config mode", () => {
    const result = parsePrompt("Router(config)#");
    expect(result.mode).toBe("config");
    expect(result.hostname).toBe("Router");
  });

  test("parses config-if mode", () => {
    const result = parsePrompt("Router(config-if)#");
    expect(result.mode).toBe("config-if");
    expect(result.hostname).toBe("Router");
  });

  test("parses config-router mode", () => {
    const result = parsePrompt("Router(config-router)#");
    expect(result.mode).toBe("config-router");
    expect(result.hostname).toBe("Router");
  });

  test("detects paged output", () => {
    const result = parsePrompt("Router# --More-- ");
    expect(result.isPaged).toBe(true);
  });

  test("handles empty prompt", () => {
    const result = parsePrompt("");
    expect(result.mode).toBe("unknown");
  });
});

describe("canExecuteCommand", () => {
  test("show commands work in privileged-exec", () => {
    expect(canExecuteCommand("privileged-exec", true)).toBe(true);
  });

  test("show commands work in config-if", () => {
    expect(canExecuteCommand("config-if", true)).toBe(true);
  });

  test("config commands need privileged or config mode", () => {
    expect(canExecuteCommand("privileged-exec", false)).toBe(true);
    expect(canExecuteCommand("config", false)).toBe(true);
    expect(canExecuteCommand("user-exec", false)).toBe(false);
  });
});

describe("isConfirmPrompt", () => {
  test("detects confirm prompts", () => {
    expect(isConfirmPrompt("Translating..._DOMAIN\rf[confirm]")).toBe(true);
    expect(isConfirmPrompt("Proceed?")).toBe(true);
    expect(isConfirmPrompt("confirmar")).toBe(true);
  });

  test("returns false for normal output", () => {
    expect(isConfirmPrompt("interface GigabitEthernet0/0")).toBe(false);
  });
});

describe("isErrorOutput", () => {
  test("detects error patterns", () => {
    expect(isErrorOutput("% Invalid command")).toBe(true);
    expect(isErrorOutput("Ambiguous command")).toBe(true);
    expect(isErrorOutput("Command not found")).toBe(true);
  });

  test("returns false for normal output", () => {
    expect(isErrorOutput("Building configuration...")).toBe(false);
    expect(isErrorOutput("OK")).toBe(false);
  });
});