import type {
  TerminalDeviceKind,
  TerminalCommandResult,
  RunTerminalCommandOptions,
} from "@cisco-auto/terminal-contracts";

function normalizeTerminalText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function isIosSyslogLine(line: string): boolean {
  return /^%[A-Z0-9_]+-\d+-[A-Z0-9_]+:/i.test(String(line ?? "").trim());
}

function stripSemanticCleanupSection(value: string): string {
  const text = normalizeTerminalText(value);
  const marker = "\n[cleanup]\n";
  const index = text.indexOf(marker);

  if (index >= 0) {
    return text.slice(0, index).trim();
  }

  return text;
}

function extractPrimaryIosErrorMessage(value: unknown): string {
  const withoutCleanup = stripSemanticCleanupSection(normalizeTerminalText(value));
  const lines = withoutCleanup
    .split("\n")
    .filter((line) => !isIosSyslogLine(line));

  const markerIndex = lines.findIndex((line) =>
    /%\s*(Invalid input detected|Incomplete command|Ambiguous command|Unknown command|Invalid command)/i.test(line),
  );

  if (markerIndex < 0) {
    return lines.join("\n").trim();
  }

  let start = markerIndex;

  while (start > 0) {
    const previous = lines[start - 1] ?? "";

    if (/^\s*\^+\s*$/.test(previous)) {
      start -= 1;
      continue;
    }

    if (previous.trim() && !/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(previous.trim())) {
      start -= 1;
      continue;
    }

    break;
  }

  return lines.slice(start, markerIndex + 1).join("\n").trim();
}

export interface IosFailureDetails {
  code: string;
  message: string;
}

export function extractIosFailureDetails(input: {
  output?: unknown;
  error?: { code?: unknown; message?: unknown };
  parsed?: unknown;
}): IosFailureDetails {
  const output = String(input.output ?? "").trim();
  const loweredOutput = output.toLowerCase();

  if (loweredOutput.includes("invalid input detected") || loweredOutput.includes("invalid command")) {
    return {
      code: "IOS_INVALID_INPUT",
      message: extractPrimaryIosErrorMessage(output) || output || "Entrada inválida en IOS",
    };
  }

  if (loweredOutput.includes("not recognized")) {
    return {
      code: "IOS_UNKNOWN_COMMAND",
      message: extractPrimaryIosErrorMessage(output) || output || "Comando IOS no reconocido",
    };
  }

  const parsed = input.parsed && typeof input.parsed === "object"
    ? (input.parsed as Record<string, unknown>)
    : {};

  const parsedError = parsed.error && typeof parsed.error === "object"
    ? (parsed.error as Record<string, unknown>)
    : {};

  const parsedCode = String(
    parsed.code ??
      parsed.errorCode ??
      parsedError.code ??
      input.error?.code ??
      "",
  );
  const parsedMessage = String(
    parsed.message ?? parsed.error ?? parsedError.message ?? input.error?.message ?? "",
  );

  if (parsedCode) {
    return {
      code: parsedCode,
      message: extractPrimaryIosErrorMessage(output) || output || parsedMessage || parsedCode,
    };
  }

  return {
    code: String(input.error?.code ?? "IOS_EXEC_FAILED"),
    message: extractPrimaryIosErrorMessage(output) || output || String(input.error?.message ?? "Error en ejecución de comando IOS"),
  };
}

export function detectIosSemanticFailure(output: unknown): { code: string; message: string } | null {
  const text = String(output ?? "");
  const recent = text.split(/\r?\n/).slice(-30).join("\n");
  const lower = recent.toLowerCase();

  if (lower.includes("% invalid input detected") || lower.includes("% invalid command")) {
    return {
      code: "IOS_INVALID_INPUT",
      message: recent.trim() || "Comando IOS con input inválido detectado",
    };
  }

  if (lower.includes("% incomplete command")) {
    return {
      code: "IOS_INCOMPLETE_COMMAND",
      message: recent.trim() || "Comando IOS incompleto",
    };
  }

  if (lower.includes("% ambiguous command")) {
    return {
      code: "IOS_AMBIGUOUS_COMMAND",
      message: recent.trim() || "Comando IOS ambiguo",
    };
  }

  if (lower.includes("% unknown command")) {
    return {
      code: "IOS_INVALID_INPUT",
      message: recent.trim() || "Comando IOS desconocido",
    };
  }

  if (lower.includes("translating...")) {
    return {
      code: "IOS_DNS_LOOKUP_TRIGGERED",
      message: recent.trim() || "DNS lookup activado durante ejecución de comando",
    };
  }

  if (lower.includes("% bad secrets")) {
    return {
      code: "IOS_PRIVILEGE_REQUIRED",
      message: recent.trim() || "Se requiere privilegio elevado",
    };
  }

  if (lower.includes("% not in config mode")) {
    return {
      code: "IOS_CONFIG_MODE_REQUIRED",
      message: recent.trim() || "Se requiere modo configuración",
    };
  }

  return null;
}

export function normalizeWarnings(warnings: unknown): string[] {
  return Array.isArray(warnings) ? warnings : [];
}

export function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  return "";
}

function normalizeIosCommand(line: string): string {
  return line.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isPrivilegedIosCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^write\b/.test(cmd) ||
    /^copy\b/.test(cmd) ||
    /^erase\b/.test(cmd) ||
    /^reload\b/.test(cmd) ||
    /^clear\b/.test(cmd) ||
    /^debug\b/.test(cmd) ||
    /^undebug\b/.test(cmd)
  );
}

export function buildCommandResult(input: {
  ok: boolean;
  action: "ios.exec" | "host.exec" | "unknown";
  device: string;
  deviceKind: TerminalDeviceKind;
  command: string;
  output: string;
  rawOutput: string;
  status: number;
  warnings: unknown;
  evidence: unknown;
  error?: {
    code: string;
    message: string;
    phase: "detection" | "execution";
  };
}): TerminalCommandResult {
  const result: TerminalCommandResult = {
    ok: input.ok,
    action: input.action,
    device: input.device,
    deviceKind: input.deviceKind,
    command: input.command,
    output: input.output,
    rawOutput: input.rawOutput,
    status: input.status,
    warnings: normalizeWarnings(input.warnings),
    evidence: input.evidence,
  };

  if (input.error) {
    result.error = input.error;
  }

  return result;
}

export function createRuntimeUnavailableResult(args: {
  action: "ios.exec" | "host.exec" | "unknown";
  device: string;
  deviceKind: TerminalDeviceKind;
  command: string;
  health: { state: "ok" | "stale" | "missing" | "unknown"; ageMs?: number; lastSeenTs?: number } | null;
  reason: string;
}): TerminalCommandResult {
  return buildCommandResult({
    ok: false,
    action: args.action,
    device: args.device,
    deviceKind: args.deviceKind,
    command: args.command,
    output: "",
    rawOutput: "",
    status: 1,
    error: {
      code: "PT_RUNTIME_UNAVAILABLE",
      message: args.reason,
      phase: "detection",
    },
    warnings: [],
    evidence: {
      heartbeat: args.health,
      reason: args.reason,
    },
  });
}

export function createUnknownDeviceResult(device: string, command: string): TerminalCommandResult {
  return buildCommandResult({
    ok: false,
    action: "unknown",
    device,
    deviceKind: "unknown",
    command,
    output: "",
    rawOutput: "",
    status: 1,
    error: {
      code: "DEVICE_NOT_FOUND_OR_UNSUPPORTED",
      message: `No se encontró el dispositivo "${device}" o no se pudo determinar si usa IOS/terminal host.`,
      phase: "detection",
    },
    warnings: [
      "Ejecuta `bun run pt device list --json` para ver los nombres exactos de dispositivos.",
    ],
    evidence: null,
  });
}