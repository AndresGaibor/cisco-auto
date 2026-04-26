// ============================================================================
// Terminal Utils Tests
// ============================================================================

import { test, expect, describe } from "bun:test";
import {
  detectWizardFromOutput,
  sleep,
  terminalOutputHasPager,
} from "../../terminal/terminal-utils";

describe("detectWizardFromOutput", () => {
  test("detects initial configuration dialog", () => {
    expect(detectWizardFromOutput("initial configuration dialog?")).toBe(true);
    expect(detectWizardFromOutput("Would you like to enter the initial configuration dialog?")).toBe(true);
  });

  test("detects yes/no prompt", () => {
    expect(detectWizardFromOutput("[yes/no]")).toBe(true);
    expect(detectWizardFromOutput("Continue? [yes/no]")).toBe(true);
  });

  test("detects Spanish configuration prompt", () => {
    expect(detectWizardFromOutput("continuar con la configuración")).toBe(true);
    expect(detectWizardFromOutput("¿Desea continuar con la configuración?")).toBe(true);
  });

  test("returns false for normal output", () => {
    expect(detectWizardFromOutput("Router#show run")).toBe(false);
    expect(detectWizardFromOutput("Interface GigabitEthernet0/0")).toBe(false);
  });
});

describe("sleep", () => {
  test("resolves after specified milliseconds", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(elapsed).toBeLessThan(100);
  });

  test("resolves immediately for 0ms", async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10);
  });
});

describe("terminalOutputHasPager", () => {
  test("detects --More-- in output", () => {
    const terminal = {
      getOutput: () => "Interface Status\r\nGigabitEthernet0/0 --More--",
    };
    expect(terminalOutputHasPager(terminal)).toBe(true);
  });

  test("detects --More-- case insensitive", () => {
    const terminal = {
      getOutput: () => "output --more--",
    };
    expect(terminalOutputHasPager(terminal)).toBe(true);
  });

  test("returns false when no pager", () => {
    const terminal = {
      getOutput: () => "Router#show version\r\nIOS 15.2",
    };
    expect(terminalOutputHasPager(terminal)).toBe(false);
  });

  test("falls back to getAllOutput", () => {
    const terminal = {
      getOutput: () => "",
      getAllOutput: () => "something --More-- here",
    };
    expect(terminalOutputHasPager(terminal)).toBe(true);
  });

  test("falls back to getBuffer", () => {
    const terminal = {
      getOutput: () => "",
      getAllOutput: () => "",
      getBuffer: () => "buffer --More-- content",
    };
    expect(terminalOutputHasPager(terminal)).toBe(true);
  });

  test("returns false on error", () => {
    const terminal = {
      getOutput: () => { throw new Error("API not available"); },
    };
    expect(terminalOutputHasPager(terminal)).toBe(false);
  });

  test("handles empty string", () => {
    const terminal = {
      getOutput: () => "",
    };
    expect(terminalOutputHasPager(terminal)).toBe(false);
  });
});
