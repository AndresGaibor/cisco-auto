// ============================================================================
// Prompt State Machine - Infer IOS prompt states
// ============================================================================

import type { IosMode as BaseIosMode } from "@cisco-auto/types";

export type IosMode =
  | BaseIosMode
  | "config-router-af"
  | "config-route-map"
  | "config-class-map"
  | "config-policy-map"
  | "config-dhcp"
  | "config-crypto-map"
  | "config-keychain"
  | "config-std-nacl"
  | "config-ext-nacl"
  | "resolving-hostname"
  | "copy-destination"
  | "copy-progress"
  | "reload-confirm"
  | "erase-confirm"
  | "username-prompt"
  | "login-prompt"
  | "desynced";

export interface PromptState {
  mode: IosMode;
  deviceName?: string;
  paging?: boolean;
  awaitingConfirm?: boolean;
  awaitingPassword?: boolean;
  awaitingDnsLookup?: boolean;
  awaitingCopyDestination?: boolean;
  awaitingReloadConfirm?: boolean;
  awaitingEraseConfirm?: boolean;
  desynced?: boolean;
}

export const IOS_PROMPT_PATTERNS = {
  userExec: />$/,
  privExec: /#$/,
  config: /\(config\)#$/,
  configIf: /\(config-if\)#$/,
  configLine: /\(config-line\)#$/,
  configRouter: /\(config-router\)#$/,
  // Extended config submodes
  configSubif: /\(config-subif\)#$/,
  configVlan: /\(config-vlan\)#$/,
  configRouterAf: /\(config-router-af\)#$/,
  configRouteMap: /\(config-route-map\)#$/,
  configClassMap: /\(config-class-map\)#$/,
  configPolicyMap: /\(config-policy-map\)#$/,
  configDhcp: /\(config-dhcp\)#$/,
  configCryptoMap: /\(config-crypto-map\)#$/,
  configKeychain: /\(config-keychain\)#$/,
  configStdNacl: /\(config-std-nacl\)|\(config-ext-nacl\)#$/,
  // Interactive prompts
  password: /^Password:/i,
  confirm: /^\[confirm\]/i,
  paging: /--More--/i,
  resolvingHostname: /translating\s+["']?.+["']?\.\.\.|unknown host or address|domain server/i,
  // Copy/erase/reload dialogs
  copyDestination: /Destination filename \[/i,
  reloadConfirm: /Proceed with reload\? \[confirm\]/i,
  eraseConfirm: /Delete filename \[/i,
  // Username/login
  username: /^Username:/i,
  // Login prompt (after username)
  loginPrompt: /^Password:.*\n.*#/i,
} as const;

export function inferPromptState(prompt: string): PromptState {
  const trimmed = prompt.trim();

  // DNS hostname lookup detection (must be first - blocks everything)
  if (IOS_PROMPT_PATTERNS.resolvingHostname.test(trimmed)) {
    return { mode: "resolving-hostname", awaitingDnsLookup: true };
  }

  if (IOS_PROMPT_PATTERNS.username.test(trimmed)) {
    return { mode: "username-prompt" };
  }

  if (IOS_PROMPT_PATTERNS.password.test(trimmed)) {
    return { mode: "awaiting-password", awaitingPassword: true };
  }

  if (IOS_PROMPT_PATTERNS.confirm.test(trimmed)) {
    return { mode: "awaiting-confirm", awaitingConfirm: true };
  }

  // Copy/erase/reload dialogs (check after confirm but before paging)
  if (IOS_PROMPT_PATTERNS.copyDestination.test(trimmed)) {
    return { mode: "copy-destination", awaitingCopyDestination: true };
  }

  if (IOS_PROMPT_PATTERNS.reloadConfirm.test(trimmed)) {
    return { mode: "reload-confirm", awaitingReloadConfirm: true };
  }

  if (IOS_PROMPT_PATTERNS.eraseConfirm.test(trimmed)) {
    return { mode: "erase-confirm", awaitingEraseConfirm: true };
  }

  if (IOS_PROMPT_PATTERNS.paging.test(trimmed)) {
    return { mode: "paging", paging: true };
  }

  // Extended config submodes (check before generic config)
  if (IOS_PROMPT_PATTERNS.configPolicyMap.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-policy-map)");
    return { mode: "config-policy-map", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configClassMap.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-class-map)");
    return { mode: "config-class-map", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configRouteMap.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-route-map)");
    return { mode: "config-route-map", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configRouterAf.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-router-af)");
    return { mode: "config-router-af", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configCryptoMap.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-crypto-map)");
    return { mode: "config-crypto-map", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configKeychain.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-keychain)");
    return { mode: "config-keychain", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configSubif.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-subif)");
    return { mode: "config-subif", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configVlan.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-vlan)");
    return { mode: "config-vlan", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configDhcp.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-dhcp)");
    return { mode: "config-dhcp", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configStdNacl.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config");
    return { mode: "config-std-nacl", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configRouter.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-router)");
    return { mode: "config-router", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configLine.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-line)");
    return { mode: "config-line", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.configIf.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config-if)");
    return { mode: "config-if", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.config.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "(config)");
    return { mode: "config", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.privExec.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, "#");
    return { mode: "privileged-exec", deviceName };
  }

  if (IOS_PROMPT_PATTERNS.userExec.test(trimmed)) {
    const deviceName = extractDeviceName(trimmed, ">");
    return { mode: "user-exec", deviceName };
  }

  return { mode: "unknown" };
}

function extractDeviceName(prompt: string, suffix: string): string {
  const idx = prompt.lastIndexOf(suffix);
  if (idx > 0) {
    return prompt.substring(0, idx);
  }
  const idx2 = prompt.lastIndexOf(")");
  if (idx2 > 0) {
    return prompt.substring(0, idx2);
  }
  return prompt.replace(/#|>| $/g, "").trim();
}

export function isPrivilegedMode(mode: IosMode): boolean {
  return mode === "privileged-exec" || mode.startsWith("config");
}

export function isConfigMode(mode: IosMode): boolean {
  return mode.startsWith("config");
}

export function needsResponse(mode: IosMode): boolean {
  return (
    mode === "awaiting-password" ||
    mode === "awaiting-confirm" ||
    mode === "paging" ||
    mode === "resolving-hostname" ||
    mode === "copy-destination" ||
    mode === "reload-confirm" ||
    mode === "erase-confirm" ||
    mode === "username-prompt" ||
    mode === "login-prompt"
  );
}

/**
 * Check if a prompt indicates an interactive dialog that requires response
 */
export function isInteractiveDialog(mode: IosMode): boolean {
  return (
    mode === "awaiting-password" ||
    mode === "awaiting-confirm" ||
    mode === "username-prompt" ||
    mode === "login-prompt" ||
    mode === "copy-destination" ||
    mode === "reload-confirm" ||
    mode === "erase-confirm"
  );
}

/**
 * Check if a mode is a recoverable/resyncable state
 */
export function isRecoverableState(mode: IosMode): boolean {
  return (
    mode === "unknown" ||
    mode === "desynced" ||
    mode === "resolving-hostname" ||
    mode === "paging"
  );
}
