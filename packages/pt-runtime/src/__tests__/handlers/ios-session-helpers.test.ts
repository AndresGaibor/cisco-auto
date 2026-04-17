import { expect, test, describe } from "bun:test";
import {
  inferModeFromPrompt,
  updateSessionFromOutput,
  isInConfigMode,
  isInPrivilegedMode,
} from "../../handlers/ios-session";

describe("ios-session helpers", () => {
  test("inferModeFromPrompt detects config mode", () => {
    expect(inferModeFromPrompt("Router(config)#")).toBe("config");
    expect(inferModeFromPrompt("Router(config-if)#")).toBe("config-if");
    expect(inferModeFromPrompt("Router(config-line)#")).toBe("config-line");
    expect(inferModeFromPrompt("Router(config-router)#")).toBe("config-router");
    expect(inferModeFromPrompt("Router(config-vlan)#")).toBe("config-vlan");
  });

  test("inferModeFromPrompt detects exec mode", () => {
    expect(inferModeFromPrompt("Router#")).toBe("privileged-exec");
    expect(inferModeFromPrompt("Router>")).toBe("user-exec");
  });

  test("inferModeFromPrompt returns unknown for unrecognized", () => {
    expect(inferModeFromPrompt("")).toBe("unknown");
    expect(inferModeFromPrompt("Press RETURN to get started")).toBe("unknown");
  });

  test("isInConfigMode returns true for config modes", () => {
    expect(isInConfigMode("config")).toBe(true);
    expect(isInConfigMode("config-if")).toBe(true);
    expect(isInConfigMode("privileged-exec")).toBe(false);
    expect(isInConfigMode("user-exec")).toBe(false);
  });

  test("isInPrivilegedMode returns true for priv exec and config modes", () => {
    expect(isInPrivilegedMode("privileged-exec")).toBe(true);
    expect(isInPrivilegedMode("config")).toBe(true);
    expect(isInPrivilegedMode("config-if")).toBe(true);
    expect(isInPrivilegedMode("user-exec")).toBe(false);
  });

  test("updateSessionFromOutput detects paging", () => {
    const session = { mode: "", paging: false, awaitingConfirm: false, awaitingPassword: false, awaitingDnsLookup: false };
    updateSessionFromOutput(session, "some output\n--More--\n");
    expect(session.paging).toBe(true);
  });

  test("updateSessionFromOutput detects confirm prompt", () => {
    const session = { mode: "", paging: false, awaitingConfirm: false, awaitingPassword: false, awaitingDnsLookup: false };
    updateSessionFromOutput(session, "\n[confirm]\n");
    expect(session.awaitingConfirm).toBe(true);
  });

  test("updateSessionFromOutput detects password prompt", () => {
    const session = { mode: "", paging: false, awaitingConfirm: false, awaitingPassword: false, awaitingDnsLookup: false };
    updateSessionFromOutput(session, "Password:");
    expect(session.awaitingPassword).toBe(true);
  });

  test("updateSessionFromOutput detects DNS lookup", () => {
    const session = { mode: "", paging: false, awaitingConfirm: false, awaitingPassword: false, awaitingDnsLookup: false };
    updateSessionFromOutput(session, "Translating \"www.example.com\"...\n");
    expect(session.awaitingDnsLookup).toBe(true);
  });
});
