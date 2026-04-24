import type {
  DeferredJobPlan,
  DeferredStep,
} from "../runtime/contracts";

// ============================================================================
// Output Sanitization
// ============================================================================

export function sanitizeTerminalOutput(command: string | undefined, output: string): string {
  // Deshabilitado temporalmente para asegurar visibilidad total
  return output;
}

// ============================================================================
// Plan Builders - Lógica de negocio que construye planes
// ============================================================================

export function buildConfigIosPlan(
  device: string,
  commands: string[],
  options: {
    save: boolean;
    stopOnError: boolean;
    ensurePrivileged: boolean;
    dismissInitialDialog: boolean;
    commandTimeoutMs: number;
    stallTimeoutMs: number;
  },
): DeferredJobPlan {
  const plan: DeferredStep[] = [];

  if (options.ensurePrivileged) {
    plan.push({ type: "ensure-mode", value: "privileged-exec", options: { stopOnError: true } });
  }

  plan.push({ type: "ensure-mode", value: "config", options: { stopOnError: true } });

  if (options.dismissInitialDialog) {
    plan.push({ type: "command", value: "", options: { stopOnError: false } });
    plan.push({ type: "confirm", value: "n", options: { stopOnError: false } });
  }

  for (const cmd of commands) {
    plan.push({
      type: "command",
      value: cmd,
      options: {
        stopOnError: options.stopOnError,
        timeoutMs: options.commandTimeoutMs,
      },
    });
  }

  if (options.save) {
    plan.push({ type: "save-config", options: { stopOnError: false } });
  }

  plan.push({ type: "close-session" });

  return {
    id: "",
    kind: "ios-session",
    version: 1,
    device,
    plan,
    options: {
      stopOnError: options.stopOnError,
      commandTimeoutMs: options.commandTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
    },
    payload: { commands, save: options.save },
  };
}

export function buildExecIosPlan(
  device: string,
  command: string,
  options: {
    ensurePrivileged: boolean;
    commandTimeoutMs: number;
    stallTimeoutMs: number;
  },
): DeferredJobPlan {
  const plan: DeferredStep[] = [];

  if (options.ensurePrivileged) {
    plan.push({ type: "ensure-mode", value: "privileged-exec", options: { stopOnError: true } });
  }

  plan.push({
    type: "command",
    value: command,
    options: {
      stopOnError: false,
      timeoutMs: options.commandTimeoutMs,
    },
  });

  plan.push({ type: "close-session" });

  return {
    id: "",
    kind: "ios-session",
    version: 1,
    device,
    plan,
    options: {
      stopOnError: false,
      commandTimeoutMs: options.commandTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
    },
    payload: { command },
  };
}
