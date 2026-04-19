// ============================================================================
// Mode Guard - Transiciones robustas de modo IOS y no-op seguro para host
// ============================================================================

import { ensureSession } from "./session-registry";
import { detectModeFromPrompt, isConfigMode, isHostMode, isPrivilegedMode } from "./prompt-detector";
import { createCommandExecutor, type PTCommandLine } from "./command-executor";
import type { TerminalMode } from "./session-state";

export interface ModeTransitionResult {
  ok: boolean;
  fromMode: TerminalMode;
  toMode: TerminalMode;
  error?: string;
  warnings?: string[];
}

function currentMode(terminal: PTCommandLine, deviceName: string): TerminalMode {
  const session = ensureSession(deviceName);
  const promptMode = detectModeFromPrompt(terminal.getPrompt());
  return promptMode !== "unknown" ? promptMode : session.lastMode;
}

export function createModeGuard() {
  const executor = createCommandExecutor();

  async function ensureNotInWizard(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
    const before = currentMode(terminal, deviceName);

    if (before !== "wizard") {
      return { ok: true, fromMode: before, toMode: before };
    }

    const result = await executor.executeCommand(deviceName, "no", terminal, {
      autoDismissWizard: true,
      commandTimeoutMs: 5000,
      stallTimeoutMs: 2000,
    });

    const after = detectModeFromPrompt(terminal.getPrompt());

    return {
      ok: result.ok && after !== "wizard",
      fromMode: before,
      toMode: after,
      error: result.ok ? undefined : result.error ?? "Failed to dismiss initial configuration dialog",
      warnings: result.warnings,
    };
  }

  async function escapeToExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
    const before = currentMode(terminal, deviceName);

    if (before === "privileged-exec" || before === "user-exec" || isHostMode(before)) {
      return { ok: true, fromMode: before, toMode: before };
    }

    const first = await executor.executeCommand(deviceName, "end", terminal, {
      commandTimeoutMs: 5000,
      stallTimeoutMs: 2000,
    });

    let after = detectModeFromPrompt(terminal.getPrompt());
    if (first.ok && (after === "privileged-exec" || after === "user-exec")) {
      return { ok: true, fromMode: before, toMode: after, warnings: first.warnings };
    }

    const second = await executor.executeCommand(deviceName, "exit", terminal, {
      commandTimeoutMs: 5000,
      stallTimeoutMs: 2000,
    });

    after = detectModeFromPrompt(terminal.getPrompt());
    return {
      ok: second.ok && (after === "privileged-exec" || after === "user-exec"),
      fromMode: before,
      toMode: after,
      error:
        second.ok && (after === "privileged-exec" || after === "user-exec")
          ? undefined
          : second.error ?? `Could not escape current mode (${before})`,
      warnings: [...(first.warnings ?? []), ...(second.warnings ?? [])],
    };
  }

  async function ensureUserExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
    await ensureNotInWizard(deviceName, terminal);

    const before = currentMode(terminal, deviceName);
    if (before === "user-exec" || isHostMode(before)) {
      return { ok: true, fromMode: before, toMode: before };
    }

    if (before === "privileged-exec" || isConfigMode(before)) {
      const escaped = await escapeToExec(deviceName, terminal);
      const afterEscape = currentMode(terminal, deviceName);

      if (!escaped.ok) return escaped;
      if (afterEscape === "user-exec") return escaped;

      if (afterEscape === "privileged-exec") {
        const disableResult = await executor.executeCommand(deviceName, "disable", terminal, {
          commandTimeoutMs: 5000,
          stallTimeoutMs: 2000,
        });
        const after = detectModeFromPrompt(terminal.getPrompt());

        return {
          ok: disableResult.ok && after === "user-exec",
          fromMode: before,
          toMode: after,
          error:
            disableResult.ok && after === "user-exec"
              ? undefined
              : disableResult.error ?? "Failed to enter user exec mode",
          warnings: disableResult.warnings,
        };
      }
    }

    return {
      ok: false,
      fromMode: before,
      toMode: currentMode(terminal, deviceName),
      error: `Cannot ensure user-exec from mode "${before}"`,
    };
  }

  async function ensurePrivilegedExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
    await ensureNotInWizard(deviceName, terminal);

    const before = currentMode(terminal, deviceName);
    if (before === "privileged-exec" || isHostMode(before)) {
      return { ok: true, fromMode: before, toMode: before };
    }

    if (isConfigMode(before)) {
      const escaped = await escapeToExec(deviceName, terminal);
      if (!escaped.ok) return escaped;
      const after = currentMode(terminal, deviceName);
      if (after === "privileged-exec") return escaped;
    }

    const modeNow = currentMode(terminal, deviceName);
    if (modeNow === "user-exec") {
      const result = await executor.executeCommand(deviceName, "enable", terminal, {
        commandTimeoutMs: 5000,
        stallTimeoutMs: 2000,
      });
      const after = detectModeFromPrompt(terminal.getPrompt());

      return {
        ok: result.ok && isPrivilegedMode(after),
        fromMode: before,
        toMode: after,
        error:
          result.ok && isPrivilegedMode(after)
            ? undefined
            : result.error ?? "Failed to enter privileged exec mode",
        warnings: result.warnings,
      };
    }

    if (modeNow === "privileged-exec") {
      return { ok: true, fromMode: before, toMode: modeNow };
    }

    return {
      ok: false,
      fromMode: before,
      toMode: modeNow,
      error: `Cannot ensure privileged-exec from mode "${before}"`,
    };
  }

  async function ensureGlobalConfig(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
    await ensureNotInWizard(deviceName, terminal);

    const before = currentMode(terminal, deviceName);
    if (isHostMode(before)) {
      return {
        ok: false,
        fromMode: before,
        toMode: before,
        error: "Host prompt does not support IOS global configuration mode",
      };
    }

    if (before === "global-config" || isConfigMode(before)) {
      return { ok: true, fromMode: before, toMode: before };
    }

    const priv = await ensurePrivilegedExec(deviceName, terminal);
    if (!priv.ok) {
      return {
        ok: false,
        fromMode: before,
        toMode: currentMode(terminal, deviceName),
        error: priv.error,
        warnings: priv.warnings,
      };
    }

    const result = await executor.executeCommand(deviceName, "configure terminal", terminal, {
      commandTimeoutMs: 5000,
      stallTimeoutMs: 2000,
      expectedMode: "global-config",
    });

    const after = detectModeFromPrompt(terminal.getPrompt());
    return {
      ok: result.ok && isConfigMode(after),
      fromMode: before,
      toMode: after,
      error:
        result.ok && isConfigMode(after)
          ? undefined
          : result.error ?? "Failed to enter global configuration mode",
      warnings: result.warnings,
    };
  }

  async function ensureReadyForPlan(
    deviceName: string,
    terminal: PTCommandLine,
    targetMode: TerminalMode,
  ): Promise<ModeTransitionResult> {
    const before = currentMode(terminal, deviceName);

    if (isHostMode(before)) {
      if (targetMode === "host-prompt" || targetMode === "unknown") {
        return { ok: true, fromMode: before, toMode: before };
      }

      if (targetMode === "host-busy") {
        return { ok: true, fromMode: before, toMode: "host-busy" };
      }

      return {
        ok: false,
        fromMode: before,
        toMode: before,
        error: `Host prompt session cannot transition to IOS mode "${targetMode}"`,
      };
    }

    switch (targetMode) {
      case "unknown":
        return {
          ok: true,
          fromMode: before,
          toMode: before,
        };
      case "wizard":
        return ensureNotInWizard(deviceName, terminal);
      case "user-exec":
        return ensureUserExec(deviceName, terminal);
      case "privileged-exec":
        return ensurePrivilegedExec(deviceName, terminal);
      case "global-config":
      case "config-if":
      case "config-line":
      case "config-router":
      case "config-vlan":
      case "config-subif":
        return ensureGlobalConfig(deviceName, terminal);
      case "host-prompt":
      case "host-busy":
        return {
          ok: false,
          fromMode: before,
          toMode: before,
          error: `IOS session cannot transition to host mode "${targetMode}"`,
        };
      default:
        return {
          ok: false,
          fromMode: before,
          toMode: before,
          error: `Unsupported target mode "${targetMode}"`,
        };
    }
  }

  return {
    ensureNotInWizard,
    ensureUserExec,
    ensurePrivilegedExec,
    ensureGlobalConfig,
    ensureReadyForPlan,
  };
}