export interface HistoryEntry {
  schemaVersion?: "1.0";
  sessionId: string;
  session_id?: string;
  correlationId?: string;
  startedAt: string;
  endedAt?: string;
  timestamp?: string;
  durationMs?: number;
  duration_ms?: number;
  action: string;
  contextSummary?: Record<string, unknown>;
  status?: "success" | "error" | "failure" | string;
  argv?: string[];
  flags?: Record<string, unknown>;
  ok?: boolean;
  commandIds?: string[];
  command_ids?: string[];
  summary?: string;
  errorCode?: string;
  errorMessage?: string;
  error_message?: string;
  rerunnable?: boolean;
  tags?: string[];
  targetDevice?: string;
  target_device?: string;
  errorMessageApp?: string;
  payloadSummary?: Record<string, unknown>;
  payload_summary?: Record<string, unknown>;
  resultSummary?: Record<string, unknown>;
  result_summary?: Record<string, unknown>;
  verificationSummary?: string;
  interactionSummary?: Record<string, unknown>;
  completionReason?: string;
  warnings?: string[];
}

export interface HistoryListFilters {
  limit?: number;
  failedOnly?: boolean;
  actionPrefix?: string;
}

export interface HistoryRepositoryPort {
  list(filters?: HistoryListFilters): Promise<HistoryEntry[]>;
  read(sessionId: string): Promise<HistoryEntry | null>;
  listAvailableSessions?(): Promise<string[]>;
}

export interface HistoryListResult {
  entries: HistoryEntry[];
  rows: string[];
  count: number;
}

export interface HistoryShowResult {
  entry: HistoryEntry | null;
  availableSessions?: string[];
  causes?: string[];
}

export interface HistoryExplainResult {
  sessionId: string;
  error?: string;
  duration?: number;
  causes: string[];
}

export interface HistoryRerunClassification {
  rerunnable: boolean;
  reason: string;
}

export interface HistoryRerunPlan {
  sessionId: string;
  entry: HistoryEntry;
  classification: HistoryRerunClassification;
  argv?: string[];
  argsToParse?: string[];
  status: string;
  targetDevice?: string;
}

export type HistoryUseCaseResult<T> =
  | {
      ok: true;
      data: T;
      advice?: string[];
    }
  | {
      ok: false;
      error: {
        code?: string;
        message: string;
        details?: Record<string, unknown>;
      };
    };

export function formatHistoryDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function truncateHistoryText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen - 3) + "...";
}

export function getHistorySessionId(entry: HistoryEntry): string {
  return entry.sessionId ?? entry.session_id ?? "";
}

export function getHistoryDuration(entry: HistoryEntry): number {
  return entry.durationMs ?? entry.duration_ms ?? 0;
}

export function getHistoryTargetDevice(entry: HistoryEntry): string | undefined {
  return entry.targetDevice ?? entry.target_device;
}

export function getHistoryCommandIds(entry: HistoryEntry): string[] | undefined {
  return entry.commandIds ?? entry.command_ids;
}

export function getHistoryErrorMessage(entry: HistoryEntry): string | undefined {
  return entry.errorMessage ?? entry.error_message;
}

export function getHistoryStatus(entry: HistoryEntry): string {
  return entry.status ?? (entry.ok ? "success" : "error");
}

export function inferHistoryFailureCauses(entry: HistoryEntry): string[] {
  const causes: string[] = [];

  const ctx = entry.contextSummary;
  if (ctx?.bridgeReady === false) {
    causes.push("Bridge no estaba listo durante la ejecución.");
  }

  if (entry.warnings?.some((warning) => /heartbeat stale|heartbeat missing/i.test(warning))) {
    causes.push("Packet Tracer parecía no estar disponible o no responder.");
  }

  if (entry.verificationSummary?.includes("not verified")) {
    causes.push("La acción pudo ejecutarse, pero no quedó verificada.");
  }

  if (entry.warnings?.some((warning) => /desincronizada|desynced/i.test(warning))) {
    causes.push("La topología pudo haber quedado desincronizada tras la ejecución.");
  }

  const errorMessage = getHistoryErrorMessage(entry);
  if (errorMessage) {
    if (/lease/i.test(errorMessage)) {
      causes.push("El lease del bridge era inválido o expiró.");
    }

    if (/runtime/i.test(errorMessage)) {
      causes.push("El runtime de PT no estaba cargado o falló.");
    }

    if (/timeout/i.test(errorMessage)) {
      causes.push("Se agotó el tiempo de espera del comando.");
    }

    if (/terminal/i.test(errorMessage)) {
      causes.push("La terminal del dispositivo no estaba disponible.");
    }
  }

  if (entry.completionReason && getHistoryStatus(entry) !== "success") {
    causes.push(`Razón de finalización: ${entry.completionReason}`);
  }

  if (causes.length === 0 && getHistoryStatus(entry) !== "success") {
    causes.push("Causa no determinada. Revisa pt logs session para más detalle.");
  }

  return causes;
}

export function classifyHistoryRerunnable(entry: HistoryEntry): HistoryRerunClassification {
  const action = entry.action ?? "";

  const nonTerminalActions = [
    "history.list",
    "history.show",
    "history.last",
    "status",
    "doctor",
    "results.list",
    "results.view",
    "device.list",
    "device.get",
    "link.list",
    "lab.list",
    "lab.validate",
    "topology.analyze",
  ];

  const writeActions = [
    "config.ios",
    "config.host",
    "device.add",
    "device.remove",
    "link.add",
    "link.remove",
    "vlan.apply",
    "stp.apply",
    "routing.apply",
    "acl.apply",
    "host.config",
    "lab.lift",
  ];

  if (nonTerminalActions.includes(action)) {
    return {
      rerunnable: true,
      reason: "Lectura idempotente, seguro re-ejecutar.",
    };
  }

  if (writeActions.includes(action)) {
    return {
      rerunnable: false,
      reason: "Acción de escritura con efectos secundarios. Re-ejecutar manualmente con precaución.",
    };
  }

  if (getHistoryStatus(entry) === "error" && getHistoryErrorMessage(entry)?.includes("confirmación")) {
    return {
      rerunnable: false,
      reason: "Requirió confirmación interactiva.",
    };
  }

  return {
    rerunnable: false,
    reason: "Tipo de acción no clasificado como rerunnable.",
  };
}

export function formatHistoryEntryCompact(entry: HistoryEntry): string {
  const status = getHistoryStatus(entry);
  const icon = status === "success" ? "✓" : status === "error" || status === "failure" ? "✗" : "?";
  const sessionId = getHistorySessionId(entry).slice(0, 8) || "unknown";
  const action = truncateHistoryText(entry.action ?? "", 15);
  const duration = formatHistoryDuration(getHistoryDuration(entry));
  const targetDevice = getHistoryTargetDevice(entry);
  const summary = targetDevice ? targetDevice.split(" ")[0] ?? targetDevice : "";

  return `${icon} ${sessionId}  ${action.padEnd(18)} ${duration.padEnd(6)} ${summary}`;
}

export async function listHistory(
  repository: HistoryRepositoryPort,
  input: HistoryListFilters,
): Promise<HistoryUseCaseResult<HistoryListResult>> {
  try {
    const entries = await repository.list({
      limit: input.limit ?? 10,
      failedOnly: input.failedOnly,
      actionPrefix: input.actionPrefix,
    });

    return {
      ok: true,
      data: {
        entries,
        rows: entries.map(formatHistoryEntryCompact),
        count: entries.length,
      },
      advice: ["Usa pt history show <sessionId> para ver detalles"],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "HISTORY_LIST_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function showHistory(
  repository: HistoryRepositoryPort,
  input: { sessionId: string },
): Promise<HistoryUseCaseResult<HistoryShowResult>> {
  try {
    const entry = await repository.read(input.sessionId);
    const availableSessions =
      !entry && repository.listAvailableSessions ? await repository.listAvailableSessions() : undefined;

    return {
      ok: true,
      data: {
        entry,
        availableSessions,
        causes: entry ? inferHistoryFailureCauses(entry) : undefined,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "HISTORY_SHOW_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { sessionId: input.sessionId },
      },
    };
  }
}

export async function getLastHistory(
  repository: HistoryRepositoryPort,
): Promise<HistoryUseCaseResult<HistoryShowResult>> {
  try {
    const entries = await repository.list({ limit: 1 });

    if (entries.length === 0) {
      return {
        ok: false,
        error: {
          code: "HISTORY_EMPTY",
          message: "No hay historial disponible",
        },
      };
    }

    const entry = entries[0]!;

    return {
      ok: true,
      data: {
        entry,
        causes: inferHistoryFailureCauses(entry),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "HISTORY_LAST_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function explainHistory(
  repository: HistoryRepositoryPort,
  input: { sessionId: string },
): Promise<HistoryUseCaseResult<HistoryExplainResult>> {
  try {
    const entry = await repository.read(input.sessionId);

    if (!entry) {
      return {
        ok: false,
        error: {
          code: "HISTORY_SESSION_NOT_FOUND",
          message: `No se encontró la sesión: ${input.sessionId}`,
          details: { sessionId: input.sessionId },
        },
      };
    }

    const status = getHistoryStatus(entry);

    if (status === "success") {
      return {
        ok: false,
        error: {
          code: "HISTORY_SESSION_SUCCESS",
          message: `La sesión ${input.sessionId} fue exitosa, no hay error que explicar`,
          details: { sessionId: input.sessionId },
        },
      };
    }

    return {
      ok: true,
      data: {
        sessionId: input.sessionId,
        error: getHistoryErrorMessage(entry),
        duration: getHistoryDuration(entry),
        causes: inferHistoryFailureCauses(entry),
      },
      advice: [
        `Usa pt logs session ${input.sessionId} para más detalles`,
        "Usa pt doctor para diagnostics",
      ],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "HISTORY_EXPLAIN_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { sessionId: input.sessionId },
      },
    };
  }
}

export async function prepareHistoryRerun(
  repository: HistoryRepositoryPort,
  input: { sessionId: string; force?: boolean },
): Promise<HistoryUseCaseResult<HistoryRerunPlan>> {
  try {
    const entry = await repository.read(input.sessionId);

    if (!entry) {
      return {
        ok: false,
        error: {
          code: "HISTORY_SESSION_NOT_FOUND",
          message: `No se encontró la sesión: ${input.sessionId}`,
          details: { sessionId: input.sessionId },
        },
      };
    }

    const classification = classifyHistoryRerunnable(entry);

    if (!classification.rerunnable && !input.force) {
      return {
        ok: false,
        error: {
          code: "HISTORY_RERUN_UNSAFE",
          message: "No es rerunnable de forma segura",
          details: {
            sessionId: input.sessionId,
            reason: classification.reason,
          },
        },
      };
    }

    const argv = entry.argv;

    if (!argv || argv.length === 0) {
      return {
        ok: false,
        error: {
          code: "HISTORY_RERUN_NO_ARGV",
          message: "La sesión no tiene argv almacenado",
          details: {
            sessionId: input.sessionId,
          },
        },
      };
    }

    return {
      ok: true,
      data: {
        sessionId: input.sessionId,
        entry,
        classification,
        argv,
        argsToParse: argv.slice(2),
        status: getHistoryStatus(entry),
        targetDevice: getHistoryTargetDevice(entry),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "HISTORY_RERUN_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { sessionId: input.sessionId },
      },
    };
  }
}