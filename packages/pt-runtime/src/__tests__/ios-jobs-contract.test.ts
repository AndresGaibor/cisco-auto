import { describe, expect, test } from "bun:test";
import { generateMainIosJobsTemplate } from "../templates/main-ios-jobs-template.ts";

const jobLifecycleSymbols = [
  "function failIosJob",
  "function createJobSession",
  "function syncJobSessionFromTerminal",
  "function readTerminalInput",
  "function classifyTerminalState",
  "function normalizeTerminalSession",
  "function containsInitialDialog",
  "function containsContinueDialog",
  "function containsAutoinstallPrompt",
  "function containsConfirmPrompt",
  "function containsPager",
  "function handleTerminalPrompt",
  "function completeIosJob",
  "function sendIosJobCommand",
  "function issueIosJobPhase",
  "function startIosJob",
  "function checkIosJobTimeouts",
  "function onTerminalOutputWritten",
  "function onTerminalCommandEnded",
  "function onTerminalPromptChanged",
  "function onTerminalMoreDisplayed",
];

const phaseTokens = [
  "dismiss-initial-dialog",
  "ensure-privileged",
  "ensure-config",
  "run-config",
  "exit-config",
  "save-config",
  "run-exec",
  "setup-dialog",
]

describe("IOS job state machine template", () => {
  test("keeps the helper surface that the refactor depends on", () => {
    const source = generateMainIosJobsTemplate();

    for (const symbol of jobLifecycleSymbols) {
      expect(source).toContain(symbol);
    }
  });

  test("keeps explicit phase tokens for dialog recovery and IOS execution", () => {
    const source = generateMainIosJobsTemplate();

    for (const token of phaseTokens) {
      expect(source).toContain(token);
    }
  });

  test("keeps prompt-gating logic for stale boot output vs real setup dialogs", () => {
    const source = generateMainIosJobsTemplate();

    expect(source).toContain("isNormalPrompt");
    expect(source).toContain("promptLooksNormal");
    expect(source).toContain("containsInitialDialog(raw)");
    expect(source).toContain("sendIosJobCommand(job.ticket, \"no\", \"dismiss-initial-dialog\")");
  });
});
