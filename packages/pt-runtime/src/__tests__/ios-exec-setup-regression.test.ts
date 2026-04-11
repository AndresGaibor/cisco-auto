import { describe, expect, test } from "bun:test";
import { isNormalPrompt, shouldDismissInitialDialog } from "../templates/ios-exec-handlers-template.ts";

type MockTerminalState = {
  prompt: string;
  mode: string;
  output: string;
  calls: string[];
};

function createMockTerminal(state: Omit<MockTerminalState, "calls">) {
  const calls: string[] = [];
  return {
    getPrompt: () => state.prompt,
    getMode: () => state.mode,
    getOutput: () => state.output,
    enterCommand: (command: string) => {
      calls.push(command);
    },
    calls,
  };
}

function simulateExecStart(term: ReturnType<typeof createMockTerminal>, command: string): string[] {
  const currentOutput = term.getOutput();
  const currentPrompt = term.getPrompt();
  const currentMode = term.getMode();
  const promptLooksNormal = isNormalPrompt(currentPrompt, currentMode);
  let setupHandledThisPass = false;

  if (!promptLooksNormal && shouldDismissInitialDialog(currentPrompt, currentMode, currentOutput)) {
    setupHandledThisPass = true;
    term.enterCommand("no");
    term.enterCommand(command);
    return term.calls;
  }

  if (!setupHandledThisPass && !promptLooksNormal && /Press RETURN to get started/i.test(currentOutput)) {
    term.enterCommand("");
    term.enterCommand(command);
    return term.calls;
  }

  term.enterCommand(command);
  return term.calls;
}

describe("IOS setup dialog regression", () => {
  test("does not send no when stale boot output remains but the prompt is already normal", () => {
    const bootNoise = `
C3560 Boot Loader...

         --- System Configuration Dialog ---

Would you like to enter the initial configuration dialog? [yes/no]: no

Press RETURN to get started!

Switch>
Translating \"no\"...domain server (255.255.255.255)
`;

    const term = createMockTerminal({
      prompt: "Switch>",
      mode: "priv-exec",
      output: bootNoise,
    });

    expect(isNormalPrompt(term.getPrompt(), term.getMode())).toBe(true);
    expect(shouldDismissInitialDialog(term.getPrompt(), term.getMode(), term.getOutput())).toBe(false);
    expect(simulateExecStart(term, "show ip interface brief")).toEqual(["show ip interface brief"]);
  });

  test("does send no when the setup dialog is truly active", () => {
    const term = createMockTerminal({
      prompt: "",
      mode: "unknown",
      output: `Would you like to enter the initial configuration dialog? [yes/no]:`,
    });

    expect(isNormalPrompt(term.getPrompt(), term.getMode())).toBe(false);
    expect(shouldDismissInitialDialog(term.getPrompt(), term.getMode(), term.getOutput())).toBe(true);
    expect(simulateExecStart(term, "show ip interface brief")).toEqual(["no", "show ip interface brief"]);
  });

  test("does not react to Press RETURN when the prompt is already normal", () => {
    const term = createMockTerminal({
      prompt: "Switch>",
      mode: "priv-exec",
      output: `Press RETURN to get started!`,
    });

    expect(simulateExecStart(term, "show version")).toEqual(["show version"]);
  });
});
