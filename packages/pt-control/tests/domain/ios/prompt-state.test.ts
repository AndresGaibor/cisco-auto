import { describe, test, expect } from "bun:test";
import {
  inferPromptState,
  IOS_PROMPT_PATTERNS,
  needsResponse,
  isPrivilegedMode,
  isConfigMode,
  isInteractiveDialog,
  isRecoverableState,
  type IosMode,
} from "@cisco-auto/ios-domain";

describe("IOS Prompt Patterns", () => {
  test("userExec pattern matches basic prompt", () => {
    expect(IOS_PROMPT_PATTERNS.userExec.test("Router>")).toBe(true);
    expect(IOS_PROMPT_PATTERNS.userExec.test("Switch>")).toBe(true);
  });

  test("privExec pattern matches # prompt", () => {
    expect(IOS_PROMPT_PATTERNS.privExec.test("Router#")).toBe(true);
    expect(IOS_PROMPT_PATTERNS.privExec.test("Router#")).toBe(true);
  });

  test("config pattern matches (config)#", () => {
    expect(IOS_PROMPT_PATTERNS.config.test("Router(config)#")).toBe(true);
  });

  test("configIf pattern matches (config-if)#", () => {
    expect(IOS_PROMPT_PATTERNS.configIf.test("Router(config-if)#")).toBe(true);
  });

  test("password pattern matches Password:", () => {
    expect(IOS_PROMPT_PATTERNS.password.test("Password:")).toBe(true);
    expect(IOS_PROMPT_PATTERNS.password.test("Password: ")).toBe(true);
  });

  test("confirm pattern matches [confirm]", () => {
    expect(IOS_PROMPT_PATTERNS.confirm.test("[confirm]")).toBe(true);
    expect(IOS_PROMPT_PATTERNS.confirm.test("[confirm]\n")).toBe(true);
  });

  test("paging pattern matches --More--", () => {
    expect(IOS_PROMPT_PATTERNS.paging.test("--More--")).toBe(true);
  });

  test("copyDestination pattern matches copy dialog", () => {
    expect(IOS_PROMPT_PATTERNS.copyDestination.test("Destination filename [startup-config]?")).toBe(true);
  });

  test("reloadConfirm pattern matches reload dialog", () => {
    expect(IOS_PROMPT_PATTERNS.reloadConfirm.test("Proceed with reload? [confirm]")).toBe(true);
  });

  test("eraseConfirm pattern matches erase dialog", () => {
    expect(IOS_PROMPT_PATTERNS.eraseConfirm.test("Delete filename [startup-config]?")).toBe(true);
  });

  test("username pattern matches Username:", () => {
    expect(IOS_PROMPT_PATTERNS.username.test("Username:")).toBe(true);
  });

  test("resolvingHostname pattern matches DNS lookups", () => {
    expect(IOS_PROMPT_PATTERNS.resolvingHostname.test('Translating "shwo"....domain server')).toBe(true);
    expect(IOS_PROMPT_PATTERNS.resolvingHostname.test("Unknown host or address")).toBe(true);
    expect(IOS_PROMPT_PATTERNS.resolvingHostname.test("domain server (255.255.255.255)")).toBe(true);
  });
});

describe("inferPromptState", () => {
  test("infers user-exec mode", () => {
    const result = inferPromptState("Router>");
    expect(result.mode).toBe("user-exec");
    expect(result.deviceName).toBe("Router");
  });

  test("infers priv-exec mode", () => {
    const result = inferPromptState("Router#");
    expect(result.mode).toBe("priv-exec");
    expect(result.deviceName).toBe("Router");
  });

  test("infers config mode", () => {
    const result = inferPromptState("Router(config)#");
    expect(result.mode).toBe("config");
    expect(result.deviceName).toBe("Router");
  });

  test("infers config-if mode", () => {
    const result = inferPromptState("Router(config-if)#");
    expect(result.mode).toBe("config-if");
    expect(result.deviceName).toBe("Router");
  });

  test("infers awaiting-password mode", () => {
    const result = inferPromptState("Password:");
    expect(result.mode).toBe("awaiting-password");
    expect(result.awaitingPassword).toBe(true);
  });

  test("infers awaiting-confirm mode", () => {
    const result = inferPromptState("[confirm]");
    expect(result.mode).toBe("awaiting-confirm");
    expect(result.awaitingConfirm).toBe(true);
  });

  test("infers resolving-hostname mode", () => {
    const result = inferPromptState('Translating "shwo"....domain server (255.255.255.255)');
    expect(result.mode).toBe("resolving-hostname");
    expect(result.awaitingDnsLookup).toBe(true);
  });

  test("infers copy-destination mode", () => {
    const result = inferPromptState("Destination filename [startup-config]?");
    expect(result.mode).toBe("copy-destination");
    expect(result.awaitingCopyDestination).toBe(true);
  });

  test("infers reload-confirm mode", () => {
    const result = inferPromptState("Proceed with reload? [confirm]");
    expect(result.mode).toBe("reload-confirm");
    expect(result.awaitingReloadConfirm).toBe(true);
  });

  test("infers erase-confirm mode", () => {
    const result = inferPromptState("Delete filename [startup-config]?");
    expect(result.mode).toBe("erase-confirm");
    expect(result.awaitingEraseConfirm).toBe(true);
  });

  test("infers username-prompt mode", () => {
    const result = inferPromptState("Username:");
    expect(result.mode).toBe("username-prompt");
  });

  test("infers paging mode", () => {
    const result = inferPromptState("Router# --More--");
    expect(result.mode).toBe("paging");
    expect(result.paging).toBe(true);
  });

  test("infers unknown for unrecognized prompts", () => {
    const result = inferPromptState("Some weird output");
    expect(result.mode).toBe("unknown");
  });

  test("extracts device name from various prompt formats", () => {
    expect(inferPromptState("Router1#").deviceName).toBe("Router1");
    expect(inferPromptState("Switch-2960(config)#").deviceName).toBe("Switch-2960");
    expect(inferPromptState("Router(config-if)#").deviceName).toBe("Router");
  });
});

describe("needsResponse", () => {
  test("returns true for interactive modes", () => {
    expect(needsResponse("awaiting-password")).toBe(true);
    expect(needsResponse("awaiting-confirm")).toBe(true);
    expect(needsResponse("paging")).toBe(true);
    expect(needsResponse("resolving-hostname")).toBe(true);
    expect(needsResponse("copy-destination")).toBe(true);
    expect(needsResponse("reload-confirm")).toBe(true);
    expect(needsResponse("erase-confirm")).toBe(true);
    expect(needsResponse("username-prompt")).toBe(true);
    expect(needsResponse("login-prompt")).toBe(true);
  });

  test("returns false for non-interactive modes", () => {
    expect(needsResponse("user-exec")).toBe(false);
    expect(needsResponse("priv-exec")).toBe(false);
    expect(needsResponse("config")).toBe(false);
    expect(needsResponse("config-if")).toBe(false);
  });
});

describe("isPrivilegedMode", () => {
  test("returns true for priv-exec and config modes", () => {
    expect(isPrivilegedMode("priv-exec")).toBe(true);
    expect(isPrivilegedMode("config")).toBe(true);
    expect(isPrivilegedMode("config-if")).toBe(true);
    expect(isPrivilegedMode("config-router")).toBe(true);
  });

  test("returns false for user-exec and interactive modes", () => {
    expect(isPrivilegedMode("user-exec")).toBe(false);
    expect(isPrivilegedMode("awaiting-password")).toBe(false);
    expect(isPrivilegedMode("paging")).toBe(false);
  });
});

describe("isConfigMode", () => {
  test("returns true for config submodes", () => {
    expect(isConfigMode("config")).toBe(true);
    expect(isConfigMode("config-if")).toBe(true);
    expect(isConfigMode("config-line")).toBe(true);
    expect(isConfigMode("config-router")).toBe(true);
    expect(isConfigMode("config-vlan")).toBe(true);
  });

  test("returns false for non-config modes", () => {
    expect(isConfigMode("priv-exec")).toBe(false);
    expect(isConfigMode("user-exec")).toBe(false);
    expect(isConfigMode("awaiting-password")).toBe(false);
  });
});

describe("isInteractiveDialog", () => {
  test("returns true for dialog modes", () => {
    expect(isInteractiveDialog("awaiting-password")).toBe(true);
    expect(isInteractiveDialog("awaiting-confirm")).toBe(true);
    expect(isInteractiveDialog("copy-destination")).toBe(true);
    expect(isInteractiveDialog("reload-confirm")).toBe(true);
    expect(isInteractiveDialog("erase-confirm")).toBe(true);
    expect(isInteractiveDialog("username-prompt")).toBe(true);
    expect(isInteractiveDialog("login-prompt")).toBe(true);
  });

  test("returns false for normal modes", () => {
    expect(isInteractiveDialog("priv-exec")).toBe(false);
    expect(isInteractiveDialog("config")).toBe(false);
    expect(isInteractiveDialog("paging")).toBe(false);
  });
});

describe("isRecoverableState", () => {
  test("returns true for recoverable states", () => {
    expect(isRecoverableState("unknown")).toBe(true);
    expect(isRecoverableState("desynced")).toBe(true);
    expect(isRecoverableState("resolving-hostname")).toBe(true);
    expect(isRecoverableState("paging")).toBe(true);
  });

  test("returns false for stable states", () => {
    expect(isRecoverableState("priv-exec")).toBe(false);
    expect(isRecoverableState("config")).toBe(false);
  });
});
