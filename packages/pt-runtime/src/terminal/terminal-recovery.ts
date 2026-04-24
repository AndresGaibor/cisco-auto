import { detectModeFromPrompt } from "./prompt-detector";

export interface RecoveryResult {
  ok: boolean;
  prompt: string;
  mode: string;
  actions: string[];
  warnings: string[];
}

export function recoverTerminalSync(
  terminal: any,
  kind: "ios" | "host"
): RecoveryResult {
  const actions: string[] = [];
  const warnings: string[] = [];

  if (terminal.enterChar) {
    try {
      terminal.enterChar(3, 0);
      actions.push("Ctrl+C enviado");
    } catch (e) {
      warnings.push("Ctrl+C falló: " + String(e));
    }
  } else {
    warnings.push("terminal.enterChar no disponible");
  }

  if (terminal.enterChar) {
    try {
      terminal.enterChar(13, 0);
      actions.push("Enter enviado");
    } catch (e) {
      warnings.push("Enter falló: " + String(e));
    }
  }

  let prompt = "";
  if (terminal.getPrompt) {
    try {
      prompt = terminal.getPrompt() ?? "";
      actions.push("Prompt leído: " + prompt);
    } catch (e) {
      warnings.push("getPrompt falló: " + String(e));
    }
  } else {
    warnings.push("terminal.getPrompt no disponible");
  }

  const mode = detectModeFromPrompt(prompt);

  const ok = actions.length > 0 && prompt.length > 0;

  return { ok, prompt, mode, actions, warnings };
}

// Usar cuando:
// - COMMAND_START_TIMEOUT
// - COMMAND_END_TIMEOUT
// - PROMPT_MISMATCH
// - MODE_MISMATCH
// - "No output received"
// - session.health === "desynced"