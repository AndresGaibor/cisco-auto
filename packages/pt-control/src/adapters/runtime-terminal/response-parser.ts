// Response parser — parsea respuestas del bridge
// NO llama al bridge — esa responsabilidad es del adapter

interface UnifiedContractValue {
  ok: boolean;
  output: string;
  session: {
    modeBefore?: string;
    modeAfter?: string;
    promptBefore?: string;
    promptAfter?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
    kind?: string;
  };
  diagnostics?: {
    statusCode?: number;
    completionReason?: string;
  };
  warnings?: string[];
  error?: string;
}

interface LegacyContractValue {
  raw?: string;
  value?: string;
  output?: string;
  parsed?: {
    promptBefore?: string;
    promptAfter?: string;
    modeBefore?: string;
    modeAfter?: string;
    warnings?: string[];
  };
  session?: {
    mode?: string;
    prompt?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
  };
  diagnostics?: {
    commandStatus?: number;
    completionReason?: string;
  };
}

interface SimpleRuntimeResultValue {
  ok?: boolean;
  code?: string;
  error?: string | { message?: string; code?: string };
  message?: string;
  raw?: string;
  output?: string;
  value?: unknown;
  parsed?: unknown;
  warnings?: string[];
  session?: {
    mode?: string;
    prompt?: string;
    modeBefore?: string;
    modeAfter?: string;
    promptBefore?: string;
    promptAfter?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
    kind?: string;
  };
  diagnostics?: {
    commandStatus?: number;
    statusCode?: number;
    completionReason?: string;
  };
}

export interface ParsedCommandResponse {
  raw: string;
  status: number;
  ok: boolean;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  parsed: unknown;
  paging: boolean;
  awaitingConfirm: boolean;
  autoDismissedInitialDialog: boolean;
  sessionKind: "host" | "ios";
  warnings: string[];
  error?: string;
  diagnostics?: {
    completionReason?: string;
    statusCode?: number;
  };
}

export interface ParseResponseOptions {
  stepIndex: number;
  isHost: boolean;
  command: string;
}

export function createResponseParser() {
  function normalizeStatusFromLegacy(value: LegacyContractValue | undefined): number {
    if (typeof value?.diagnostics?.commandStatus === "number") {
      return value.diagnostics.commandStatus;
    }

    const raw = String(value?.raw ?? value?.value ?? value?.output ?? "");
    if (!raw) return 0;

    const lines = raw.split("\n");
    const recentLines = lines.slice(-15).join("\n");

    if (
      recentLines.includes("% Invalid") ||
      recentLines.includes("% Incomplete") ||
      recentLines.includes("% Ambiguous") ||
      recentLines.includes("% Unknown") ||
      recentLines.includes("%Error") ||
      recentLines.toLowerCase().includes("invalid command") ||
      recentLines.includes("Command not found")
    ) {
      return 1;
    }

    return 0;
  }

  function parseCommandResponse(
    res: unknown,
    options: ParseResponseOptions,
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;
    const warnings: string[] = [];

    const value = res as UnifiedContractValue | undefined;
    const hasUnifiedContract =
      typeof value?.ok === "boolean" &&
      value?.diagnostics &&
      value?.session &&
      typeof value?.output === "string";

    if (hasUnifiedContract) {
      return parseUnifiedContract(value, options, warnings);
    }

    const simpleValue = res as SimpleRuntimeResultValue | undefined;
    if (typeof simpleValue?.ok === "boolean") {
      return parseSimpleRuntimeResult(simpleValue, options, warnings);
    }

    return parseLegacyContract(res as LegacyContractValue | undefined, options, warnings, stepIndex);
  }

  function parseUnifiedContract(
    res: UnifiedContractValue,
    options: ParseResponseOptions,
    warnings: string[],
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;
    const tr = res;

    const raw = String(tr.output ?? "");
    const status = Number(tr.diagnostics?.statusCode ?? (tr.ok ? 0 : 1));

    const promptBefore = stepIndex === 0 ? String(tr.session?.promptBefore ?? "") : "";
    const promptAfter = String(tr.session?.promptAfter ?? "");
    const modeBefore = stepIndex === 0 ? String(tr.session?.modeBefore ?? "") : "";
    const modeAfter = String(tr.session?.modeAfter ?? "");

    const sessionInfo = tr.session ?? {};

    if (tr.warnings && Array.isArray(tr.warnings)) {
      warnings.push(...tr.warnings);
    }

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: tr.ok,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: tr,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
      error: tr.error,
      diagnostics: tr.diagnostics,
    };
  }

  function parseLegacyContract(
    res: LegacyContractValue | undefined,
    options: ParseResponseOptions,
    warnings: string[],
    stepIndex: number,
  ): ParsedCommandResponse {
    const { isHost, command } = options;

    const raw = String(
      res?.output ?? res?.raw ?? (typeof res?.value === "string" ? res.value : "") ?? "",
    );
    const status = normalizeStatusFromLegacy(res);

    const parsedInfo = (res?.parsed ?? {}) as {
      promptBefore?: string;
      promptAfter?: string;
      modeBefore?: string;
      modeAfter?: string;
      warnings?: string[];
    };

    const promptBefore =
      stepIndex === 0
        ? String(parsedInfo.promptBefore ?? res?.session?.prompt ?? "")
        : "";
    const promptAfter = String(parsedInfo.promptAfter ?? res?.session?.prompt ?? "");
    const modeBefore =
      stepIndex === 0
        ? String(parsedInfo.modeBefore ?? res?.session?.mode ?? "")
        : "";
    const modeAfter = String(parsedInfo.modeAfter ?? res?.session?.mode ?? "");

    const sessionInfo = res?.session ?? {};

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: status === 0,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: res?.parsed,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
    };
  }

  function parseSimpleRuntimeResult(
    res: SimpleRuntimeResultValue,
    options: ParseResponseOptions,
    warnings: string[],
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;

    const raw = String(
      res.output ??
        res.raw ??
        (typeof res.value === "string" ? res.value : "") ??
        "",
    );

    const status = Number(
      res.diagnostics?.statusCode ??
        res.diagnostics?.commandStatus ??
        (res.ok ? 0 : 1),
    );

    const sessionInfo = res.session ?? {};

    const promptBefore =
      stepIndex === 0
        ? String(sessionInfo.promptBefore ?? sessionInfo.prompt ?? "")
        : "";

    const promptAfter = String(sessionInfo.promptAfter ?? sessionInfo.prompt ?? "");

    const modeBefore =
      stepIndex === 0
        ? String(sessionInfo.modeBefore ?? sessionInfo.mode ?? "")
        : "";

    const modeAfter = String(sessionInfo.modeAfter ?? sessionInfo.mode ?? "");

    if (Array.isArray(res.warnings)) {
      warnings.push(...res.warnings.map(String));
    }

    const errorText =
      typeof res.error === "string"
        ? res.error
        : String(res.error?.message ?? res.message ?? res.code ?? "");

    if (!res.ok && errorText) {
      warnings.push(errorText);
    }

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: Boolean(res.ok),
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: res.parsed ?? res,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
      error: errorText || undefined,
      diagnostics: {
        completionReason: res.diagnostics?.completionReason,
        statusCode: status,
      },
    };
  }

  function buildEventFromResponse(
    parsed: ParsedCommandResponse,
    step: { kind?: string; command?: string; expectMode?: string; expectPromptPattern?: string; optional?: boolean },
    stepIndex: number,
  ): Record<string, unknown> {
    return {
      stepIndex,
      kind: step.kind ?? "command",
      command: step.command ?? "",
      status: parsed.status,
      ok: parsed.ok,
      promptAfter: parsed.promptAfter,
      modeAfter: parsed.modeAfter,
      completionReason: parsed.diagnostics?.completionReason,
      paging: parsed.paging,
      awaitingConfirm: parsed.awaitingConfirm,
      autoDismissedInitialDialog: parsed.autoDismissedInitialDialog,
      sessionKind: parsed.sessionKind,
      expectMode: step.expectMode,
      expectPromptPattern: step.expectPromptPattern,
      optional: step.optional,
      error: parsed.error,
      diagnostics: parsed.diagnostics,
    };
  }

  function checkPromptMismatch(
    parsed: ParsedCommandResponse,
    step: { expectedPrompt?: string; expectPromptPattern?: string },
  ): string | null {
    const expected = step.expectedPrompt ?? step.expectPromptPattern;
    if (!expected) return null;
    if (!parsed.promptAfter) return null;
    if (parsed.promptAfter.includes(expected)) return null;
    return `Prompt esperado "${expected}" no alcanzado. Prompt final: "${parsed.promptAfter}"`;
  }

  return {
    parseCommandResponse,
    buildEventFromResponse,
    checkPromptMismatch,
  };
}

export type ResponseParser = ReturnType<typeof createResponseParser>;
