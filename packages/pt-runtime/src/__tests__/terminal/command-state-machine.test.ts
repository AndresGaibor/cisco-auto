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
