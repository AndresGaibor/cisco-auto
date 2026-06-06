import { describe, expect, test } from "bun:test";
import {
  TERMINAL_ERROR_CODES,
  DEFAULT_POLICY,
  SAFE_POLICY,
  INTERACTIVE_POLICY,
} from "../index.js";

describe("TERMINAL_ERROR_CODES", () => {
  test("contiene todos los códigos de error esperados", () => {
    const codes: readonly string[] = Object.values(TERMINAL_ERROR_CODES);
    expect(codes).toContain("DEVICE_NOT_FOUND");
    expect(codes).toContain("DEVICE_NOT_READY");
    expect(codes).toContain("MODE_TRANSITION_FAILED");
    expect(codes).toContain("COMMAND_TIMEOUT");
    expect(codes).toContain("COMMAND_STALLED");
    expect(codes).toContain("PAGER_STUCK");
    expect(codes).toContain("CONFIRM_TIMEOUT");
    expect(codes).toContain("DNS_HANGUP");
    expect(codes).toContain("IOS_INVALID_INPUT");
    expect(codes).toContain("IOS_INCOMPLETE");
    expect(codes).toContain("IOS_AMBIGUOUS");
    expect(codes).toContain("IOS_WRONG_MODE");
    expect(codes).toContain("SEMANTIC_MISMATCH");
    expect(codes).toContain("UNKNOWN");
  });

  test("no tiene códigos duplicados", () => {
    const codes = Object.values(TERMINAL_ERROR_CODES);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  test("cada código coincide con su key", () => {
    const entries = Object.entries(TERMINAL_ERROR_CODES) as [string, string][];
    for (const [key, value] of entries) {
      expect(value).toBe(key);
    }
  });
});

describe("Presets de políticas (TerminalPolicy)", () => {
  describe("DEFAULT_POLICY", () => {
    test("tiene todos los campos requeridos", () => {
      expect(DEFAULT_POLICY).toBeDefined();
      expect(DEFAULT_POLICY.autoPager).toBe(true);
      expect(DEFAULT_POLICY.autoConfirm).toBe(false);
      expect(DEFAULT_POLICY.allowDestructive).toBe(false);
      expect(DEFAULT_POLICY.allowEmptyOutput).toBe(false);
      expect(DEFAULT_POLICY.commandTimeoutMs).toBe(30000);
      expect(DEFAULT_POLICY.stallTimeoutMs).toBe(15000);
      expect(DEFAULT_POLICY.retries).toBe(1);
      expect(DEFAULT_POLICY.recovery).toBe("ctrl-c-enter");
    });
  });

  describe("SAFE_POLICY", () => {
    test("tiene valores más conservadores que DEFAULT", () => {
      expect(SAFE_POLICY.autoConfirm).toBe(false);
      expect(SAFE_POLICY.allowDestructive).toBe(false);
      expect(SAFE_POLICY.stallTimeoutMs).toBe(20000);
      expect(SAFE_POLICY.retries).toBe(2);
      expect(SAFE_POLICY.recovery).toBe("ctrl-c-enter");
    });
  });

  describe("INTERACTIVE_POLICY", () => {
    test("permite comandos interactivos y destructivos", () => {
      expect(INTERACTIVE_POLICY.autoConfirm).toBe(true);
      expect(INTERACTIVE_POLICY.allowDestructive).toBe(true);
      expect(INTERACTIVE_POLICY.allowEmptyOutput).toBe(true);
      expect(INTERACTIVE_POLICY.commandTimeoutMs).toBe(60000);
      expect(INTERACTIVE_POLICY.stallTimeoutMs).toBe(30000);
      expect(INTERACTIVE_POLICY.retries).toBe(3);
    });
  });

  test("cada política tiene un valor de recovery válido", () => {
    const validRecoveries = ["none", "soft", "ctrl-c-enter"];
    for (const policy of [DEFAULT_POLICY, SAFE_POLICY, INTERACTIVE_POLICY]) {
      expect(validRecoveries).toContain(policy.recovery);
    }
  });

  test("cada política tiene commandTimeoutMs > 0", () => {
    for (const policy of [DEFAULT_POLICY, SAFE_POLICY, INTERACTIVE_POLICY]) {
      expect(policy.commandTimeoutMs).toBeGreaterThan(0);
    }
  });

  test("cada política tiene stallTimeoutMs > 0", () => {
    for (const policy of [DEFAULT_POLICY, SAFE_POLICY, INTERACTIVE_POLICY]) {
      expect(policy.stallTimeoutMs).toBeGreaterThan(0);
    }
  });

  test("stallTimeoutMs nunca es mayor que commandTimeoutMs", () => {
    for (const policy of [DEFAULT_POLICY, SAFE_POLICY, INTERACTIVE_POLICY]) {
      expect(policy.stallTimeoutMs).toBeLessThanOrEqual(policy.commandTimeoutMs);
    }
  });
});

describe("Exportaciones de runtime", () => {
  test("los valores exportados están disponibles", () => {
    expect(DEFAULT_POLICY).toBeDefined();
    expect(SAFE_POLICY).toBeDefined();
    expect(INTERACTIVE_POLICY).toBeDefined();
    expect(TERMINAL_ERROR_CODES).toBeDefined();
  });
});
