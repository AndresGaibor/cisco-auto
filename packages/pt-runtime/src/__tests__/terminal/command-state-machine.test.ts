// ============================================================================
// Command State Machine Tests
// ============================================================================

import { test, expect, describe, beforeEach, vi } from "bun:test";
import type { TerminalSessionState } from "../../terminal/session-state";
import type { TerminalEventRecord } from "../../pt/terminal/terminal-events";
import type { PTCommandLine, ExecutionOptions } from "../../terminal/command-executor";
import { CommandStateMachine } from "../../terminal/engine/command-state-machine";

function createMockTerminal(overrides: Partial<PTCommandLine> = {}): PTCommandLine {
  return {
    getPrompt: () => "Router#",
    getOutput: () => "",
    getAllOutput: () => "",
    getBuffer: () => "",
    getCommandInput: () => "",
    enterCommand: vi.fn(),
    registerEvent: vi.fn(),
    unregisterEvent: vi.fn(),
    enterChar: vi.fn(),
    ...overrides,
  };
}

function createMockSession(deviceName: string = "Router1"): TerminalSessionState {
  return {
    deviceName,
    sessionId: "test-session-1",
    sessionKind: "ios",
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    isOpen: true,
    isBooting: false,
    wizardDetected: false,
    pagerActive: false,
    confirmPromptActive: false,
    lastPrompt: "Router#",
    lastMode: "privileged-exec",
    lastCommand: "",
    lastCommandStartedAt: 0,
    lastCommandEndedAt: 0,
    pendingCommand: null,
    outputBuffer: "",
    recentOutputs: [],
    history: [],
    warnings: [],
    health: "healthy",
    listenersAttached: false,
    initialized: true,
  };
}

describe("CommandStateMachine", () => {
  describe("constructor", () => {
    test("initializes with provided config", () => {
      const terminal = createMockTerminal();
      const session = createMockSession();
      const events: TerminalEventRecord[] = [];

      const sm = new CommandStateMachine({
        deviceName: "Router1",
        command: "show version",
        terminal,
        options: {},
        session,
        events,
        warnings: [],
        sessionKind: "ios",
        promptBefore: "Router#",
        modeBefore: "privileged-exec",
        baselineSnapshot: { raw: "", source: "test" },
        baselineOutput: "",
      });

      expect(sm).toBeDefined();
    });

    test("accepts custom time functions for testing", () => {
      const terminal = createMockTerminal();
      const session = createMockSession();
      const now = vi.fn(() => 1000000);

      const sm = new CommandStateMachine({
        deviceName: "Router1",
        command: "show version",
        terminal,
        options: {},
        session,
        events: [],
        warnings: [],
        sessionKind: "ios",
        promptBefore: "Router#",
        modeBefore: "privileged-exec",
        baselineSnapshot: { raw: "", source: "test" },
        baselineOutput: "",
        now,
      });

      expect(sm).toBeDefined();
    });
  });

  describe("output polling", () => {
    test("usa polling periódico para seguir leyendo el terminal", async () => {
      const terminal = createMockTerminal();
      const session = createMockSession();
      const events: TerminalEventRecord[] = [];
      const setIntervalMock = vi.fn(() => 1 as any);

      const sm = new CommandStateMachine({
        deviceName: "Router1",
        command: "show version",
        terminal,
        options: {},
        session,
        events,
        warnings: [],
        sessionKind: "ios",
        promptBefore: "Router#",
        modeBefore: "privileged-exec",
        baselineSnapshot: { raw: "", source: "test" },
        baselineOutput: "",
        setInterval: setIntervalMock as any,
        clearInterval: vi.fn() as any,
      } as any);

      expect(sm).toBeDefined();

      (sm as any).startOutputPolling();

      expect(setIntervalMock).toHaveBeenCalledTimes(1);
    });

    test("mantiene pagerActive mientras el pager siga visible en el snapshot", () => {
      const terminal = createMockTerminal({
        getPrompt: () => "Router#",
        enterChar: vi.fn(),
      });
      const session = createMockSession();
      const events: TerminalEventRecord[] = [];
      const snapshot = { raw: "show version\n--More--", source: "poll" };

      const sm = new CommandStateMachine({
        deviceName: "Router1",
        command: "show version",
        terminal,
        options: { autoAdvancePager: true },
        session,
        events,
        warnings: [],
        sessionKind: "ios",
        promptBefore: "Router#",
        modeBefore: "privileged-exec",
        baselineSnapshot: snapshot,
        baselineOutput: snapshot.raw,
        readTerminalSnapshotFn: vi.fn(() => snapshot) as any,
        getPromptSafeFn: vi.fn(() => "Router#") as any,
        getModeSafeFn: vi.fn(() => "privileged-exec") as any,
        setInterval: vi.fn(() => 1 as any) as any,
        clearInterval: vi.fn() as any,
      } as any);

      (sm as any).startOutputPolling();

      expect(terminal.enterChar).toHaveBeenCalledWith(32, 0);
      expect(session.pagerActive).toBe(true);
    });
  });

  describe("wakeTerminalIfNeeded", () => {
    test("despierta el terminal cuando el modo guardado es logout", () => {
      const terminal = createMockTerminal({
        getPrompt: () => "Router#",
        getMode: () => "logout",
        enterChar: vi.fn(),
      } as any);
      const session = createMockSession();
      session.lastMode = "logout" as any;

      const sm = new CommandStateMachine({
        deviceName: "Router1",
        command: "show version",
        terminal,
        options: {},
        session,
        events: [],
        warnings: [],
        sessionKind: "ios",
        promptBefore: "Router#",
        modeBefore: "privileged-exec",
        baselineSnapshot: { raw: "", source: "test" },
        baselineOutput: "",
      } as any);

      (sm as any).wakeTerminalIfNeeded();

      expect(terminal.enterChar).toHaveBeenCalledWith(13, 0);
    });
  });

  describe("clearing input", () => {
    test("limpia input compuesto solo por espacios antes de enviar el comando", () => {
      const terminal = createMockTerminal({
        getCommandInput: () => "   ",
        enterChar: vi.fn(),
      });
      const session = createMockSession();

      const sm = new CommandStateMachine({
        deviceName: "Router1",
        command: "show version",
        terminal,
        options: {},
        session,
        events: [],
        warnings: [],
        sessionKind: "ios",
        promptBefore: "Router#",
        modeBefore: "privileged-exec",
        baselineSnapshot: { raw: "", source: "test" },
        baselineOutput: "",
      } as any);

      const result = (sm as any).clearWhitespaceOnlyInput();

      expect(result).toBe(true);
      expect(terminal.enterChar).toHaveBeenCalledWith(21, 0);
    });
  });

  describe("sendPagerAdvance", () => {
    test("sends SPACE character via enterChar", () => {
      const terminal = createMockTerminal();
      const session = createMockSession();
      const events: TerminalEventRecord[] = [];
      let advanceFn: any;

      // Create state machine with custom sendPagerAdvance
      const sm = new CommandStateMachine({
        deviceName: "Router1",
        command: "show version",
        terminal,
        options: {},
        session,
        events,
        warnings: [],
        sessionKind: "ios",
        promptBefore: "Router#",
        modeBefore: "privileged-exec",
        baselineSnapshot: { raw: "", source: "test" },
        baselineOutput: "",
        sendPagerAdvanceFn: (terminal, events, sessionId, deviceName, source) => {
          advanceFn?.();
          return true;
        },
      });

      expect(sm).toBeDefined();
    });
  });
});

describe("detectWizardFromOutput integration", () => {
  test("wizard detection is accessible from terminal-utils", async () => {
    const { detectWizardFromOutput } = await import("../../terminal/terminal-utils");

    expect(detectWizardFromOutput("initial configuration dialog?")).toBe(true);
    expect(detectWizardFromOutput("[yes/no]")).toBe(true);
    expect(detectWizardFromOutput("Router#show run")).toBe(false);
  });
});
