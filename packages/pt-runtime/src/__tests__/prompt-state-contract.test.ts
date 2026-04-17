import { describe, expect, test } from "bun:test";
import {
  IOS_PROMPT_PATTERNS,
  inferPromptState,
  isInteractiveDialog,
  isRecoverableState,
  needsResponse,
  type IosMode,
} from "@cisco-auto/ios-domain";

const promptCases: Array<[string, IosMode]> = [
  ["Switch>", "user-exec"],
  ["R1#", "privileged-exec"],
  ["R1(config)#", "config"],
  ["R1(config-if)#", "config-if"],
  ["R1(config-line)#", "config-line"],
  ["R1(config-router)#", "config-router"],
  ["Username:", "username-prompt"],
  ["Password:", "awaiting-password"],
  ["Proceed with reload? [confirm]", "reload-confirm"],
  ["Destination filename [startup-config]?", "copy-destination"],
  ["Delete filename [startup-config]?", "erase-confirm"],
  ["Translating 'shwo'....domain server (255.255.255.255)", "resolving-hostname"],
  ["--More--", "paging"],
];

describe("IOS prompt-state contract", () => {
  test("infers the expected mode for common IOS prompts", () => {
    for (const [prompt, expectedMode] of promptCases) {
      expect(inferPromptState(prompt).mode).toBe(expectedMode);
    }
  });

  test("keeps the interactive-response matrix stable", () => {
    const responseModes = [
      "awaiting-password",
      "awaiting-confirm",
      "paging",
      "resolving-hostname",
      "copy-destination",
      "reload-confirm",
      "erase-confirm",
      "username-prompt",
      "login-prompt",
    ] as const;

    for (const mode of responseModes) {
      expect(needsResponse(mode)).toBe(true);
    }

    expect(isInteractiveDialog("awaiting-password")).toBe(true);
    expect(isInteractiveDialog("awaiting-confirm")).toBe(true);
    expect(isInteractiveDialog("username-prompt")).toBe(true);
    expect(isInteractiveDialog("login-prompt")).toBe(true);
    expect(isInteractiveDialog("copy-destination")).toBe(true);
    expect(isInteractiveDialog("reload-confirm")).toBe(true);
    expect(isInteractiveDialog("erase-confirm")).toBe(true);
    expect(isInteractiveDialog("privileged-exec")).toBe(false);
  });

  test("keeps recoverable states and prompt regexes available", () => {
    expect(isRecoverableState("unknown")).toBe(true);
    expect(isRecoverableState("desynced")).toBe(true);
    expect(isRecoverableState("resolving-hostname")).toBe(true);
    expect(isRecoverableState("paging")).toBe(true);
    expect(isRecoverableState("privileged-exec")).toBe(false);

    expect(IOS_PROMPT_PATTERNS.resolvingHostname.test('Translating "shwo"....domain server')).toBe(true);
    expect(IOS_PROMPT_PATTERNS.copyDestination.test("Destination filename [startup-config]?")) .toBe(true);
    expect(IOS_PROMPT_PATTERNS.reloadConfirm.test("Proceed with reload? [confirm]")).toBe(true);
    expect(IOS_PROMPT_PATTERNS.eraseConfirm.test("Delete filename [startup-config]?")) .toBe(true);
  });
});
