import { describe, expect, test } from "bun:test";
import {
  applyTerminalEvidenceBarrier,
  inferTerminalCapabilityId,
} from "./terminal-evidence-barrier.js";

describe("terminal-evidence-barrier", () => {
  test("infiere terminal.show-version desde show version", () => {
    expect(inferTerminalCapabilityId("show version")).toBe("terminal.show-version");
  });

  test("infiere terminal.show-running-config desde show running-config", () => {
    expect(inferTerminalCapabilityId("show running-config")).toBe("terminal.show-running-config");
  });

  test("devuelve null para comando desconocido", () => {
    expect(inferTerminalCapabilityId("show foo bar")).toBeNull();
  });

  test("acepta running-config válido", () => {
    const result = applyTerminalEvidenceBarrier({
      command: "show running-config",
      rawOutput: "Building configuration...\n!\nend\nSW1#",
    });

    expect(result.override).toBe(false);
  });

  test("rechaza running-config contaminado con comandos ajenos", () => {
    const result = applyTerminalEvidenceBarrier({
      command: "show running-config",
      rawOutput:
        "Building configuration...\nSW1#show version\nSW1#show ip interface brief\nSW1#enable\nSW1#",
    });

    expect(result.override).toBe(true);
    expect(result.error?.code).toBe("IOS_OUTPUT_COMMAND_MISMATCH");
  });

  test("acepta show version válido", () => {
    const result = applyTerminalEvidenceBarrier({
      command: "show version",
      rawOutput: "Cisco IOS Software, C2960 Software\nVersion 15.0\nSW1#",
    });

    expect(result.override).toBe(false);
  });
});
