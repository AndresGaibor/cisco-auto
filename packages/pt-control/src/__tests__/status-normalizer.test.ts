import { test, expect, describe } from "bun:test";
import {
  normalizeStatus,
  normalizeRuntimeErrorStatus,
  detectHostMode,
  type ExecInteractiveValue,
} from "../adapters/runtime-terminal/status-normalizer.js";

describe("normalizeStatus", () => {
  test("returns 0 for empty value", () => {
    expect(normalizeStatus({})).toBe(0);
    expect(normalizeStatus({ raw: "" })).toBe(0);
    expect(normalizeStatus({ value: "" })).toBe(0);
    expect(normalizeStatus({ output: "" })).toBe(0);
  });

  test("returns diagnostic commandStatus when present", () => {
    const val: ExecInteractiveValue = {
      diagnostics: { commandStatus: 0 },
    };
    expect(normalizeStatus(val)).toBe(0);
  });

  test("returns 1 for non-zero diagnostic commandStatus", () => {
    const val: ExecInteractiveValue = {
      diagnostics: { commandStatus: 2 },
    };
    expect(normalizeStatus(val)).toBe(2);
  });

  test("detects % Invalid error in recent lines", () => {
    const val: ExecInteractiveValue = {
      raw: "some old output\n% Invalid command",
    };
    expect(normalizeStatus(val)).toBe(1);
  });

  test("detects % Incomplete error", () => {
    const val: ExecInteractiveValue = {
      raw: "% Incomplete command",
    };
    expect(normalizeStatus(val)).toBe(1);
  });

  test("detects % Ambiguous error", () => {
    const val: ExecInteractiveValue = {
      raw: "% Ambiguous command",
    };
    expect(normalizeStatus(val)).toBe(1);
  });

  test("detects % Unknown error", () => {
    const val: ExecInteractiveValue = {
      raw: "% Unknown command",
    };
    expect(normalizeStatus(val)).toBe(1);
  });

  test("detects %Error", () => {
    const val: ExecInteractiveValue = {
      raw: "%Error: some error",
    };
    expect(normalizeStatus(val)).toBe(1);
  });

  test("detects invalid command (case insensitive)", () => {
    const val: ExecInteractiveValue = {
      raw: "INVALID COMMAND",
    };
    expect(normalizeStatus(val)).toBe(1);
  });

  test("detects Command not found", () => {
    const val: ExecInteractiveValue = {
      raw: "Command not found",
    };
    expect(normalizeStatus(val)).toBe(1);
  });

  test("ignores errors in older lines (beyond last 15)", () => {
    const oldLines = Array(20).fill("some old output line");
    const val: ExecInteractiveValue = {
      raw: [...oldLines, "good output"].join("\n"),
    };
    expect(normalizeStatus(val)).toBe(0);
  });

  test("returns 0 for clean output", () => {
    const val: ExecInteractiveValue = {
      raw: "Router# show running-config\nBuilding configuration...",
    };
    expect(normalizeStatus(val)).toBe(0);
  });

  test("uses value field when raw is absent", () => {
    const val: ExecInteractiveValue = {
      value: "% Invalid",
    };
    expect(normalizeStatus(val)).toBe(1);
  });

  test("uses output field when raw and value are absent", () => {
    const val: ExecInteractiveValue = {
      output: "% Incomplete command",
    };
    expect(normalizeStatus(val)).toBe(1);
  });
});

describe("normalizeRuntimeErrorStatus", () => {
  test("returns 1 for 0 (mapped to failure)", () => {
    expect(normalizeRuntimeErrorStatus(0)).toBe(1);
  });

  test("returns status as-is for non-zero finite numbers", () => {
    expect(normalizeRuntimeErrorStatus(1)).toBe(1);
    expect(normalizeRuntimeErrorStatus(2)).toBe(2);
    expect(normalizeRuntimeErrorStatus(127)).toBe(127);
  });

  test("returns 1 for non-finite numbers", () => {
    expect(normalizeRuntimeErrorStatus(Infinity)).toBe(1);
    expect(normalizeRuntimeErrorStatus(-Infinity)).toBe(1);
    expect(normalizeRuntimeErrorStatus(NaN)).toBe(1);
  });

  test("returns 1 for non-numeric values", () => {
    expect(normalizeRuntimeErrorStatus("error")).toBe(1);
    expect(normalizeRuntimeErrorStatus(null)).toBe(1);
    expect(normalizeRuntimeErrorStatus(undefined)).toBe(1);
    expect(normalizeRuntimeErrorStatus({})).toBe(1);
  });
});

describe("detectHostMode", () => {
  test("returns false when session is undefined", () => {
    expect(detectHostMode(undefined)).toBe(false);
  });

  test("returns false when mode is undefined", () => {
    expect(detectHostMode({ mode: "" })).toBe(false);
  });

  test("detects host mode for PC", () => {
    expect(detectHostMode({ mode: "PC" })).toBe(true);
  });

  test("detects host mode for Server", () => {
    expect(detectHostMode({ mode: "SERVER" })).toBe(true);
  });

  test("detects host mode for mode containing host", () => {
    expect(detectHostMode({ mode: "host" })).toBe(true);
    expect(detectHostMode({ mode: "HOST COMMAND" })).toBe(true);
  });

  test("returns false for IOS modes", () => {
    expect(detectHostMode({ mode: "privileged exec" })).toBe(false);
    expect(detectHostMode({ mode: "global config" })).toBe(false);
    expect(detectHostMode({ mode: "interface config" })).toBe(false);
  });

  test("is case insensitive", () => {
    expect(detectHostMode({ mode: "Host" })).toBe(true);
    expect(detectHostMode({ mode: "Pc" })).toBe(true);
    expect(detectHostMode({ mode: "SERVER" })).toBe(true);
  });
});
