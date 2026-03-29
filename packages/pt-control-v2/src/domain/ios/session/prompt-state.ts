// ============================================================================
// Prompt State Machine - Infer IOS prompt states
// ============================================================================

export type IosMode =
  | "user-exec"
  | "priv-exec"
  | "config"
  | "config-if"
  | "config-line"
  | "config-router"
  | "awaiting-password"
  | "awaiting-confirm"
  | "paging"
  | "unknown";

export interface PromptState {
  mode: IosMode;
  deviceName?: string;
  paging?: boolean;
  awaitingConfirm?: boolean;
}

export const IOS_PROMPT_PATTERNS = {
  userExec: />$/,
  privExec: /#$/,
  config: /\(config\)#$/,
  configIf: /\(config-if\)#$/,
  configLine: /\(config-line\)#$/,
  configRouter: /\(config-router\)#$/,
  password: /^Password:/i,
  confirm: /^\[confirm\]/i,
  paging: /--More--/i,
} as const;

export function inferPromptState(prompt: string): PromptState {
  const trimmed = prompt.trim();

  if (IOS_PROMPT_PATTERNS.password.test(trimmed)) {
    return { mode: "awaiting-password" };
  }

  if (IOS_PROMPT_PATTERNS.confirm.test(trimmed)) {
    return { mode: "awaiting-confirm" };
  }

  if (IOS_PROMPT_PATTERNS.paging.test(trimmed)) {
    return { mode: "paging" };
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
    return { mode: "priv-exec", deviceName };
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
  return mode === "priv-exec" || mode.startsWith("config");
}

export function isConfigMode(mode: IosMode): boolean {
  return mode.startsWith("config");
}

export function needsResponse(mode: IosMode): boolean {
  return (
    mode === "awaiting-password" ||
    mode === "awaiting-confirm" ||
    mode === "paging"
  );
}
