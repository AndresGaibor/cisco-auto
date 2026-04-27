import { test, expect, describe, beforeEach, vi } from "bun:test";
import { IosSetupGuard } from "./setup-guard.js";
import { IosPromptState } from "./prompt-classifier.js";

describe("IosSetupGuard", () => {
  let setupGuard: IosSetupGuard;

  beforeEach(() => {
    setupGuard = new IosSetupGuard();
  });

  describe("classifyOutput", () => {
    test("clasifica prompt normal como NORMAL", () => {
      const estados = setupGuard.classifyOutput("Router#");
      expect(estados).toContain(IosPromptState.NORMAL);
    });

    test("clasifica setup dialog correctamente", () => {
      const output = "Would you like to enter the initial configuration dialog? [yes/no]:";
      const estados = setupGuard.classifyOutput(output);
      expect(estados).toContain(IosPromptState.SETUP_DIALOG);
    });

    test("clasifica press RETURN correctamente", () => {
      const output = "Press RETURN to get started!";
      const estados = setupGuard.classifyOutput(output);
      expect(estados).toContain(IosPromptState.PRESS_RETURN);
    });
  });

  describe("isSetupDialogActive", () => {
    test("retorna true cuando hay setup dialog", () => {
      const output = "Would you like to enter the initial configuration dialog? [yes/no]:";
      expect(setupGuard.isSetupDialogActive(output)).toBe(true);
    });

    test("retorna false cuando no hay setup dialog", () => {
      expect(setupGuard.isSetupDialogActive("Router#")).toBe(false);
    });
  });

  describe("isPressReturnActive", () => {
    test("retorna true cuando hay press RETURN", () => {
      const output = "Press RETURN to get started!";
      expect(setupGuard.isPressReturnActive(output)).toBe(true);
    });

    test("retorna false cuando no hay press RETURN", () => {
      expect(setupGuard.isPressReturnActive("Router#")).toBe(false);
    });
  });

  describe("generateDismissCommand", () => {
    test("genera comando para setup dialog en router", () => {
      const output = "Would you like to enter the initial configuration dialog? [yes/no]:";
      const result = setupGuard.generateDismissCommand(output, "router");
      expect(result.strategy).toBe("setup_dialog");
      expect(result.command).toBe("no");
    });

    test("genera comando para press RETURN", () => {
      const output = "Press RETURN to get started!";
      const result = setupGuard.generateDismissCommand(output, "router");
      expect(result.strategy).toBe("press_return");
      expect(result.command).toBe("\r\n");
    });

    test("retorna strategy none para prompt normal", () => {
      const result = setupGuard.generateDismissCommand("Router#", "router");
      expect(result.strategy).toBe("none");
      expect(result.command).toBe("");
    });
  });

  describe("detect", () => {
    test("detecta que no hay setup activo en prompt normal", () => {
      const result = setupGuard.detect("Router#", "router");
      expect(result.wasActive).toBe(false);
      expect(result.dismissed).toBe(false);
      expect(result.attempts).toBe(0);
    });

    test("detecta setup dialog activo", () => {
      const output = "Would you like to enter the initial configuration dialog? [yes/no]:";
      const result = setupGuard.detect(output, "router");
      expect(result.wasActive).toBe(true);
      expect(result.dismissed).toBe(false);
      expect(result.finalState).toBe(IosPromptState.SETUP_DIALOG);
    });

    test("para PC no intenta detectar setup", () => {
      const result = setupGuard.detect("PC>", "pc");
      expect(result.wasActive).toBe(false);
      expect(result.dismissed).toBe(false);
    });
  });

  describe("validateSessionMode", () => {
    test("valida modo user correctamente", () => {
      expect(setupGuard.validateSessionMode(IosPromptState.NORMAL, "user")).toBe(true);
      expect(setupGuard.validateSessionMode(IosPromptState.AWAITING_INPUT, "user")).toBe(true);
    });

    test("valida modo privileged correctamente", () => {
      expect(setupGuard.validateSessionMode(IosPromptState.NORMAL, "privileged")).toBe(true);
    });

    test("retorna false para modo incorrecto", () => {
      expect(setupGuard.validateSessionMode(IosPromptState.NORMAL, "config")).toBe(false);
    });
  });
});
