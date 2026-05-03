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
  done?: boolean;
  status?: number;
  result?: {
    ok?: boolean;
    raw?: string;
    output?: string;
    status?: number;
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
  };
  code?: string;
  errorCode?: string;
  error?: string | { message?: string; code?: string; errorCode?: string };
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
  function normalizeResponseText(value: unknown): string {
    return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function extractIosSemanticErrorText(value: unknown): string | null {
    const text = normalizeResponseText(value).trim();

    if (!text) return null;

    const lines = text.split("\n");
    const errorLineIndex = lines.findIndex((line) =>
      /%\s*(Invalid input detected|Incomplete command|Ambiguous command|Unknown command)/i.test(line),
    );

    if (errorLineIndex < 0) {
      return null;
    }

    const startIndex = Math.max(0, errorLineIndex - 2);

    return lines.slice(startIndex, errorLineIndex + 1).join("\n").trim();
  }

  function semanticErrorsMatch(a: unknown, b: unknown): boolean {
    const left = extractIosSemanticErrorText(a);
    const right = extractIosSemanticErrorText(b);

    if (!left || !right) return false;

    return left === right || left.includes(right) || right.includes(left);
  }

  function shouldSuppressWarningForSemanticFailure(warning: unknown, raw: unknown, errorText: unknown): boolean {
    const text = normalizeResponseText(warning).trim();

    if (!text) return true;

    if (!extractIosSemanticErrorText(text)) {
      return false;
    }

    return semanticErrorsMatch(text, raw) || semanticErrorsMatch(text, errorText);
  }

  function escapeResponseRegExp(value: string): string {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function lineLooksLikePrompt(line: string): boolean {
    const value = String(line ?? "").trim();

    if (!value) return false;

    return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(value);
  }

  function lineLooksLikeCommandEcho(line: string, command: string): boolean {
    const value = String(line ?? "").trim();
    const cmd = String(command ?? "").trim();

    if (!value || !cmd) return false;

    if (value.toLowerCase() === cmd.toLowerCase()) return true;

    const escaped = escapeResponseRegExp(cmd);

    if (new RegExp(`^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*${escaped}\\s*$`, "i").test(value)) {
      return true;
    }

    return new RegExp(`^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]?\\s+${escaped}\\s*$`, "i").test(value);
  }

  function sliceOutputByCommand(raw: string, command: string): string {
    const text = normalizeResponseText(raw);
    const cmd = String(command ?? "").trim();

    if (!text || !cmd) return text;

    const lines = text.split("\n");
    let commandLineIndex = -1;

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (lineLooksLikeCommandEcho(lines[index] || "", cmd)) {
        commandLineIndex = index;
        break;
      }
    }

    if (commandLineIndex === -1) {
      const commandIndex = text.toLowerCase().lastIndexOf(cmd.toLowerCase());
      if (commandIndex === -1) return text;
      return text.slice(commandIndex).trim();
    }

    let endIndex = lines.length;

    for (let index = commandLineIndex + 1; index < lines.length; index += 1) {
      const line = lines[index] || "";

      if (index > commandLineIndex + 1 && lineLooksLikePrompt(line)) {
        endIndex = index + 1;
        break;
      }
    }

    return lines.slice(commandLineIndex, endIndex).join("\n").trim();
  }

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

    const raw = sliceOutputByCommand(String(tr.output ?? ""), command);
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

    const raw = sliceOutputByCommand(String(
      res?.output ?? res?.raw ?? (typeof res?.value === "string" ? res.value : "") ?? "",
    ), command);
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
    const resAny = res as any;

    const nestedResult = resAny.result;
    const status = Number(
      nestedResult?.status ??
        resAny.status ??
        resAny.diagnostics?.statusCode ??
        resAny.diagnostics?.commandStatus ??
        (nestedResult?.ok ?? resAny.ok ? 0 : 1),
    );

    const resultOk = Boolean(nestedResult?.ok ?? resAny.ok);
    const failed = !resultOk || status !== 0 || Boolean(resAny.code || resAny.errorCode || nestedResult?.code);

    const rawSource = String(
      nestedResult?.rawOutput ??
        nestedResult?.raw ??
        nestedResult?.output ??
        resAny.raw ??
        resAny.output ??
        (typeof resAny.error === "string" ? resAny.error : resAny.error?.message) ??
        resAny.message ??
        "",
    );

    const slicedRaw = sliceOutputByCommand(rawSource, command);
    const raw = slicedRaw.trim() ? slicedRaw : normalizeResponseText(rawSource);

    const sessionInfo = nestedResult?.session ?? resAny.session ?? {};

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

    const rawSemanticErrorText = extractIosSemanticErrorText(raw);

    const topLevelErrorText =
      typeof resAny.error === "string"
        ? resAny.error
        : String(resAny.error?.message ?? resAny.message ?? resAny.code ?? resAny.errorCode ?? "");

    const nestedErrorText =
      typeof nestedResult?.error === "string"
        ? nestedResult.error
        : String(nestedResult?.error?.message ?? nestedResult?.message ?? nestedResult?.code ?? nestedResult?.errorCode ?? "");

    const errorText = rawSemanticErrorText ?? topLevelErrorText ?? nestedErrorText;

    if (Array.isArray(resAny.warnings)) {
      for (const warning of resAny.warnings.map(String)) {
        if (failed && shouldSuppressWarningForSemanticFailure(warning, raw, errorText)) {
          continue;
        }

        warnings.push(warning);
      }
    }

    if (
      failed &&
      topLevelErrorText &&
      !raw.includes(topLevelErrorText) &&
      !shouldSuppressWarningForSemanticFailure(topLevelErrorText, raw, errorText)
    ) {
      warnings.push(topLevelErrorText);
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
      ok: resultOk,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: resAny.parsed ?? resAny,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
      error: errorText || undefined,
      diagnostics: {
        completionReason: resAny.diagnostics?.completionReason,
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
