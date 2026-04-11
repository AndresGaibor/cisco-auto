import { test, expect, describe } from "bun:test";
import { PromptClassifier, IosPromptState } from "./prompt-classifier";

describe("PromptClassifier", () => {
  const classifier = new PromptClassifier();

  describe("isSetupDialog", () => {
    test("detecta Would you like to enter the initial configuration dialog", () => {
      const output = "Would you like to enter the initial configuration dialog? [yes/no]:";
      expect(classifier.isSetupDialog(output)).toBe(true);
    });

    test("detecta initial configuration dialog sin Would", () => {
      const output = " --- Initial configuration dialog ---";
      expect(classifier.isSetupDialog(output)).toBe(true);
    });

    test("no detecta falso positivo en output normal", () => {
      const output = "Router#show ip int brief";
      expect(classifier.isSetupDialog(output)).toBe(false);
    });
  });

  describe("isPressReturn", () => {
    test("detecta Press RETURN to get started", () => {
      const output = "Press RETURN to get started!";
      expect(classifier.isPressReturn(output)).toBe(true);
    });
  });

  describe("isNormalPrompt", () => {
    test("detecta prompt # normal", () => {
      expect(classifier.isNormalPrompt("Router#")).toBe(true);
    });

    test("detecta prompt > normal", () => {
      expect(classifier.isNormalPrompt("Router>")).toBe(true);
    });

    test("detecta prompt (config)#", () => {
      expect(classifier.isNormalPrompt("Router(config)#")).toBe(true);
    });
  });

  describe("classify", () => {
    test("devuelve NORMAL para prompt de router estándar", () => {
      const output = "Router#show ip int brief";
      const states = classifier.classify(output);
      expect(states).toEqual([IosPromptState.NORMAL]);
    });

    test("devuelve SETUP_DIALOG para diálogo de configuración inicial", () => {
      const output = "Would you like to enter the initial configuration dialog? [yes/no]:";
      const states = classifier.classify(output);
      expect(states).toEqual([IosPromptState.SETUP_DIALOG]);
    });

    test("devuelve PRESS_RETURN para mensaje de inicio", () => {
      const output = "Press RETURN to get started!";
      const states = classifier.classify(output);
      expect(states).toEqual([IosPromptState.PRESS_RETURN]);
    });

    test("devuelve array vacío para output vacío", () => {
      const output = "";
      const states = classifier.classify(output);
      expect(states).toEqual([]);
    });

    test("devuelve NORMAL para prompt en modo configuración", () => {
      const output = "Router(config)#";
      const states = classifier.classify(output);
      expect(states).toEqual([IosPromptState.NORMAL]);
    });

    test("devuelve SETUP_DIALOG para dialog alternativo", () => {
      const output = " --- Initial configuration dialog ---";
      const states = classifier.classify(output);
      expect(states).toEqual([IosPromptState.SETUP_DIALOG]);
    });
  });
});
