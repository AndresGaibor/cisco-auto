import type { TerminalCommandResult } from "@cisco-auto/terminal-contracts";

export interface CompleteShowInterfacesOptions {
  device: string;
  execute: (command: string, timeoutMs?: number) => Promise<TerminalCommandResult>;
  timeoutMs?: number;
  settleDelayMs?: number;
  blockRetryCount?: number;
  blockRetryDelayMs?: number;
}

export interface CompleteInterfaceFailure {
  interface: string;
  command: string;
  code?: string;
  message?: string;
  status?: number;
}

export type CompleteInterfaceBlockCandidateSource =
  | "output"
  | "rawOutput"
  | "raw"
  | "parsed.raw"
  | "parsed.output";

export type CompleteInterfaceBlockRejectReason =
  | "empty_candidate"
  | "missing_requested_interface_header"
  | "matched_different_interface_header"
  | "invalid_block_start";

export interface CompleteInterfaceBlockCandidateEvidence {
  source: CompleteInterfaceBlockCandidateSource;
  ok: boolean;
  reason?: CompleteInterfaceBlockRejectReason;
  matchedInterface?: string;
  preview?: string;
}

export interface CompleteInterfaceRejectedAttemptEvidence {
  attempt: number;
  status?: number;
  warnings: string[];
  candidates: CompleteInterfaceBlockCandidateEvidence[];
}

export interface CompleteInterfaceExecutionEvidence {
  interface: string;
  command: string;
  attempts: number;
  ok: boolean;
  durationMs: number;
  code?: string;
  message?: string;
  status?: number;
  blockSource?: CompleteInterfaceBlockCandidateSource;
  rejectedAttempts?: CompleteInterfaceRejectedAttemptEvidence[];
}

export interface CompleteInterfacesEvidence {
  enabled: true;
  discoveryCommand: string;
  interfaces: string[];
  total: number;
  succeeded: string[];
  failed: CompleteInterfaceFailure[];
  retryCount: number;
  durationMs: number;
  attemptedCommands: string[];
  perInterface: CompleteInterfaceExecutionEvidence[];
  partialGlobalAvoided: true;
}

export interface CompleteShowInterfacesResult extends Omit<TerminalCommandResult, "evidence"> {
  evidence: TerminalCommandResult["evidence"] & {
    completeInterfaces?: CompleteInterfacesEvidence;
  };
}

const PRIMARY_DISCOVERY_COMMAND = "show ip interface brief";
const FALLBACK_DISCOVERY_COMMAND = "show running-config";
const DEFAULT_BRIEF_DISCOVERY_TIMEOUT_MS = 15_000;
const DEFAULT_RUNNING_CONFIG_DISCOVERY_TIMEOUT_MS = 60_000;
const DEFAULT_INTERFACE_TIMEOUT_MS = 15_000;
const DEFAULT_SETTLE_DELAY_MS = 150;
const DEFAULT_BLOCK_RETRY_COUNT = 2;
const DEFAULT_BLOCK_RETRY_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

const PARTIAL_LONG_OUTPUT_WARNING_PREFIX = "Output posiblemente parcial:";

function isPartialLongOutputWarning(warning: string): boolean {
  return String(warning ?? "").startsWith(PARTIAL_LONG_OUTPUT_WARNING_PREFIX);
}

function mergeNonPartialWarnings(...sources: Array<unknown>): string[] {
  return mergeWarnings(...sources).filter((warning) => !isPartialLongOutputWarning(warning));
}

export function isCompleteShowInterfacesRequest(command: string): boolean {
  return /^show\s+interfaces?$/i.test(String(command ?? "").trim().replace(/\s+/g, " "));
}

function normalizeInterfaceName(value: string): string {
  return String(value ?? "").trim().replace(/\s+/g, "");
}

function isLikelyIosInterfaceName(value: string): boolean {
  const name = normalizeInterfaceName(value);

  return /^(?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Port-Channel|Loopback|Tunnel|Null)\S+$/i.test(
    name,
  );
}

function escapeRegExp(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEol(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function lineLooksLikePrompt(line: string): boolean {
  return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(String(line ?? "").trim());
}

function lineLooksLikeAnyInterfaceHeader(line: string): boolean {
  return /^(?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Port-Channel|Loopback|Tunnel|Null)\S*\s+is\s+/i.test(
    String(line ?? "").trim(),
  );
}

function lineLooksLikeInterfaceHeader(line: string, iface: string): boolean {
  const escaped = escapeRegExp(normalizeInterfaceName(iface));
  return new RegExp(`^${escaped}\\s+is\\s+`, "i").test(String(line ?? "").trim());
}

function lineLooksLikeCommandEchoForInterface(line: string, iface: string): boolean {
  const escapedIface = escapeRegExp(normalizeInterfaceName(iface));
  const value = String(line ?? "").trim();

  return new RegExp(
    `^(?:[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*)?show\\s+interfaces?\\s+${escapedIface}\\s*$`,
    "i",
  ).test(value);
}

function lineLooksLikeAnyShowInterfacesCommandEcho(line: string): boolean {
  const value = String(line ?? "").trim();

  return /^(?:[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*)?show\s+interfaces?\s+(?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Port-Channel|Loopback|Tunnel|Null)\S+\s*$/i.test(
    value,
  );
}

function stripPromptAndEchoEdges(block: string, iface: string): string {
  const lines = normalizeEol(block).split("\n");

  while (lines.length > 0) {
    const first = lines[0] ?? "";

    if (!first.trim() || lineLooksLikePrompt(first) || lineLooksLikeCommandEchoForInterface(first, iface)) {
      lines.shift();
      continue;
    }

    break;
  }

  while (lines.length > 0) {
    const last = lines[lines.length - 1] ?? "";

    if (!last.trim() || lineLooksLikePrompt(last)) {
      lines.pop();
      continue;
    }

    break;
  }

  return lines.join("\n").trim();
}

export function extractInterfaceShowBlock(output: string, iface: string): string | null {
  const text = normalizeEol(output);
  const lines = text.split("\n");

  const headerIndexes: number[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lineLooksLikeInterfaceHeader(lines[index] ?? "", iface)) {
      headerIndexes.push(index);
    }
  }

  if (headerIndexes.length === 0) {
    return null;
  }

  const startIndex = headerIndexes[headerIndexes.length - 1]!;
  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (lineLooksLikePrompt(line)) {
      endIndex = index;
      break;
    }

    if (lineLooksLikeAnyShowInterfacesCommandEcho(line)) {
      endIndex = index;
      break;
    }

    if (lineLooksLikeCommandEchoForInterface(line, iface)) {
      endIndex = index;
      break;
    }

    if (lineLooksLikeAnyInterfaceHeader(line) && !lineLooksLikeInterfaceHeader(line, iface)) {
      endIndex = index;
      break;
    }

    if (/^interface\s+\S+/i.test(line.trim())) {
      endIndex = index;
      break;
    }

    if (/^Building configuration\.\.\./i.test(line.trim())) {
      endIndex = index;
      break;
    }

    if (/^Current configuration\s*:/i.test(line.trim())) {
      endIndex = index;
      break;
    }
  }

  const block = stripPromptAndEchoEdges(lines.slice(startIndex, endIndex).join("\n"), iface);

  if (!lineLooksLikeInterfaceHeader(block.split("\n")[0] ?? "", iface)) {
    return null;
  }

  return block;
}

function truncatePreview(value: unknown, maxLength = 160): string {
  const normalized = normalizeEol(value)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, 4)
    .join("\\n");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
}

function firstInterfaceHeaderName(output: unknown): string | undefined {
  for (const line of normalizeEol(output).split("\n")) {
    const match = line.trim().match(
      /^((?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Port-Channel|Loopback|Tunnel|Null)\S*)\s+is\s+/i,
    );

    if (match?.[1]) {
      return normalizeInterfaceName(match[1]);
    }
  }

  return undefined;
}

function inspectInterfaceShowBlockCandidate(
  source: CompleteInterfaceBlockCandidateSource,
  candidate: unknown,
  iface: string,
): { block: string | null; evidence: CompleteInterfaceBlockCandidateEvidence } {
  const text = normalizeEol(candidate);

  if (!text.trim()) {
    return {
      block: null,
      evidence: {
        source,
        ok: false,
        reason: "empty_candidate",
      },
    };
  }

  const block = extractInterfaceShowBlock(text, iface);

  if (block) {
    return {
      block,
      evidence: {
        source,
        ok: true,
      },
    };
  }

  const matchedInterface = firstInterfaceHeaderName(text);
  const normalizedIface = normalizeInterfaceName(iface);

  return {
    block: null,
    evidence: {
      source,
      ok: false,
      reason:
        matchedInterface && matchedInterface.toLowerCase() !== normalizedIface.toLowerCase()
          ? "matched_different_interface_header"
          : "missing_requested_interface_header",
      matchedInterface,
      preview: truncatePreview(text),
    },
  };
}

function extractBestInterfaceBlock(result: TerminalCommandResult, iface: string): {
  block: string | null;
  source?: CompleteInterfaceBlockCandidateSource;
  candidates: CompleteInterfaceBlockCandidateEvidence[];
} {
  const candidates: Array<[CompleteInterfaceBlockCandidateSource, unknown]> = [
    ["output", result.output],
    ["rawOutput", result.rawOutput],
    ["raw", (result as any).raw],
    ["parsed.raw", (result as any).parsed?.raw],
    ["parsed.output", (result as any).parsed?.output],
  ];

  const evidence: CompleteInterfaceBlockCandidateEvidence[] = [];

  for (const [source, candidate] of candidates) {
    const inspected = inspectInterfaceShowBlockCandidate(source, candidate, iface);
    evidence.push(inspected.evidence);

    if (inspected.block) {
      return {
        block: inspected.block,
        source,
        candidates: evidence,
      };
    }
  }

  return {
    block: null,
    candidates: evidence,
  };
}

export function parseInterfacesFromRunningConfig(output: string): string[] {
  const seen = new Set<string>();
  const interfaces: string[] = [];

  for (const line of String(output ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    const match = line.match(/^interface\s+(.+?)\s*$/i);

    if (!match) {
      continue;
    }

    const iface = normalizeInterfaceName(match[1] ?? "");

    if (!iface || !isLikelyIosInterfaceName(iface) || seen.has(iface.toLowerCase())) {
      continue;
    }

    seen.add(iface.toLowerCase());
    interfaces.push(iface);
  }

  return interfaces;
}

export function parseInterfacesFromIpInterfaceBrief(output: string): string[] {
  const seen = new Set<string>();
  const interfaces: string[] = [];

  for (const line of String(output ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || /^Interface\s+/i.test(trimmed)) {
      continue;
    }

    const firstToken = normalizeInterfaceName(trimmed.split(/\s+/)[0] ?? "");

    if (!firstToken || !isLikelyIosInterfaceName(firstToken) || seen.has(firstToken.toLowerCase())) {
      continue;
    }

    seen.add(firstToken.toLowerCase());
    interfaces.push(firstToken);
  }

  return interfaces;
}

function mergeWarnings(...sources: Array<unknown>): string[] {
  const result: string[] = [];

  for (const source of sources) {
    if (!Array.isArray(source)) {
      continue;
    }

    for (const warning of source.map(String)) {
      if (!result.includes(warning)) {
        result.push(warning);
      }
    }
  }

  return result;
}

function elapsedSince(startedAtMs: number): number {
  return Math.max(0, Date.now() - startedAtMs);
}

function recordAttemptedCommand(commands: string[], command: string): void {
  if (!commands.includes(command)) {
    commands.push(command);
  }
}

interface BuildCompleteInterfacesEvidenceInput
  extends Omit<CompleteInterfacesEvidence, "total" | "durationMs" | "attemptedCommands" | "perInterface"> {
  startedAtMs: number;
  attemptedCommands: string[];
  perInterface: CompleteInterfaceExecutionEvidence[];
}

function buildCompleteInterfacesEvidence(input: BuildCompleteInterfacesEvidenceInput): CompleteInterfacesEvidence {
  const { startedAtMs, attemptedCommands, perInterface, ...base } = input;

  return {
    ...base,
    total: base.interfaces.length,
    durationMs: elapsedSince(startedAtMs),
    attemptedCommands: [...attemptedCommands],
    perInterface: [...perInterface],
  };
}

function mergeEvidence(
  base: unknown,
  completeInterfaces: CompleteInterfacesEvidence,
): CompleteShowInterfacesResult["evidence"] {
  const evidence =
    base && typeof base === "object"
      ? { ...(base as Record<string, unknown>) }
      : {};

  return {
    ...evidence,
    completeInterfaces,
  } as CompleteShowInterfacesResult["evidence"];
}

export async function executeCompleteShowInterfaces(
  options: CompleteShowInterfacesOptions,
): Promise<CompleteShowInterfacesResult> {
  const startedAtMs = Date.now();
  const attemptedCommands: string[] = [];
  const perInterface: CompleteInterfaceExecutionEvidence[] = [];

  const briefDiscoveryTimeoutMs = Math.max(
    Number(options.timeoutMs ?? 0) || 0,
    DEFAULT_BRIEF_DISCOVERY_TIMEOUT_MS,
  );
  const runningConfigDiscoveryTimeoutMs = Math.max(
    Number(options.timeoutMs ?? 0) || 0,
    DEFAULT_RUNNING_CONFIG_DISCOVERY_TIMEOUT_MS,
  );
  const interfaceTimeoutMs = Math.max(Number(options.timeoutMs ?? 0) || 0, DEFAULT_INTERFACE_TIMEOUT_MS);

  const settleDelayMs = Math.max(0, Number(options.settleDelayMs ?? DEFAULT_SETTLE_DELAY_MS) || 0);
  const blockRetryCount = Math.max(
    0,
    Math.floor(Number(options.blockRetryCount ?? DEFAULT_BLOCK_RETRY_COUNT) || 0),
  );
  const blockRetryDelayMs = Math.max(
    0,
    Number(options.blockRetryDelayMs ?? DEFAULT_BLOCK_RETRY_DELAY_MS) || 0,
  );

  let retryCount = 0;

  let discoveryCommand = PRIMARY_DISCOVERY_COMMAND;
  recordAttemptedCommand(attemptedCommands, PRIMARY_DISCOVERY_COMMAND);
  let discovery = await options.execute(PRIMARY_DISCOVERY_COMMAND, briefDiscoveryTimeoutMs);

  if (!discovery.ok) {
    return {
      ...discovery,
      command: "show interfaces",
      warnings: mergeWarnings(discovery.warnings, [
        "No se pudo completar show interfaces por partes porque falló show ip interface brief.",
      ]),
      evidence: mergeEvidence(
        discovery.evidence,
        buildCompleteInterfacesEvidence({
          startedAtMs,
          attemptedCommands,
          perInterface,
          enabled: true,
          discoveryCommand: PRIMARY_DISCOVERY_COMMAND,
          interfaces: [],
          succeeded: [],
          failed: [
            {
              interface: "*discovery*",
              command: PRIMARY_DISCOVERY_COMMAND,
              code: discovery.error?.code,
              message: discovery.error?.message,
              status: discovery.status,
            },
          ],
          retryCount: 0,
          partialGlobalAvoided: true,
        }),
      ),
    };
  }

  let interfaces = parseInterfacesFromIpInterfaceBrief(discovery.output || discovery.rawOutput || "");

  if (interfaces.length === 0) {
    recordAttemptedCommand(attemptedCommands, FALLBACK_DISCOVERY_COMMAND);
    const fallback = await options.execute(FALLBACK_DISCOVERY_COMMAND, runningConfigDiscoveryTimeoutMs);

    if (!fallback.ok) {
      return {
        ...fallback,
        command: "show interfaces",
        warnings: mergeWarnings(fallback.warnings, [
          "No se pudo completar show interfaces por partes: show ip interface brief no listó interfaces y falló show running-config.",
        ]),
        evidence: mergeEvidence(
          fallback.evidence,
          buildCompleteInterfacesEvidence({
            startedAtMs,
            attemptedCommands,
            perInterface,
            enabled: true,
            discoveryCommand: FALLBACK_DISCOVERY_COMMAND,
            interfaces: [],
            succeeded: [],
            failed: [
              {
                interface: "*discovery*",
                command: FALLBACK_DISCOVERY_COMMAND,
                code: fallback.error?.code,
                message: fallback.error?.message,
                status: fallback.status,
              },
            ],
            retryCount: 0,
            partialGlobalAvoided: true,
          }),
        ),
      };
    }

    discoveryCommand = FALLBACK_DISCOVERY_COMMAND;
    discovery = fallback;
    interfaces = parseInterfacesFromRunningConfig(fallback.output || fallback.rawOutput || "");
  }

  if (interfaces.length === 0) {
    return {
      ...discovery,
      ok: false,
      command: "show interfaces",
      output: "",
      rawOutput: "",
      status: 1,
      error: {
        code: "IOS_INTERFACES_DISCOVERY_EMPTY",
        message: "No se encontraron interfaces para ejecutar show interfaces por partes.",
        phase: "execution",
      },
      warnings: mergeWarnings(discovery.warnings),
      evidence: mergeEvidence(
        discovery.evidence,
        buildCompleteInterfacesEvidence({
          startedAtMs,
          attemptedCommands,
          perInterface,
          enabled: true,
          discoveryCommand,
          interfaces: [],
          succeeded: [],
          failed: [],
          retryCount: 0,
          partialGlobalAvoided: true,
        }),
      ),
    };
  }

  const blocks: string[] = [];
  const succeeded: string[] = [];
  const failed: Array<{
    interface: string;
    command: string;
    code?: string;
    message?: string;
    status?: number;
  }> = [];
  const warnings: string[] = [];

  for (const iface of interfaces) {
    const command = `show interfaces ${iface}`;
    const interfaceStartedAtMs = Date.now();
    recordAttemptedCommand(attemptedCommands, command);

    let lastResult: TerminalCommandResult | null = null;
    let lastBlock: string | null = null;
    let blockSource: CompleteInterfaceBlockCandidateSource | undefined;
    const rejectedAttempts: CompleteInterfaceRejectedAttemptEvidence[] = [];
    let attempts = 0;

    for (let attempt = 0; attempt <= blockRetryCount; attempt += 1) {
      if (settleDelayMs > 0) {
        await sleep(attempt === 0 ? settleDelayMs : Math.max(settleDelayMs, blockRetryDelayMs));
      }

      const result = await options.execute(command, interfaceTimeoutMs);
      lastResult = result;
      attempts += 1;

      if (!result.ok) {
        break;
      }

      const extracted = extractBestInterfaceBlock(result, iface);

      if (extracted.block) {
        lastBlock = extracted.block;
        blockSource = extracted.source;
        break;
      }

      rejectedAttempts.push({
        attempt: attempts,
        status: result.status,
        warnings: mergeWarnings(result.warnings),
        candidates: extracted.candidates,
      });

      if (attempt < blockRetryCount) {
        retryCount += 1;
        await sleep(blockRetryDelayMs);
      }
    }

    if (!lastResult) {
      failed.push({
        interface: iface,
        command,
        code: "IOS_INTERFACE_NOT_EXECUTED",
        message: `No se ejecutó "${command}".`,
        status: 1,
      });
      perInterface.push({
        interface: iface,
        command,
        attempts,
        ok: false,
        durationMs: elapsedSince(interfaceStartedAtMs),
        code: "IOS_INTERFACE_NOT_EXECUTED",
        message: `No se ejecutó "${command}".`,
        status: 1,
        ...(rejectedAttempts.length > 0 ? { rejectedAttempts } : {}),
      });
      continue;
    }

    if (!lastResult.ok) {
      warnings.push(...mergeWarnings(lastResult.warnings));
      failed.push({
        interface: iface,
        command,
        code: lastResult.error?.code,
        message: lastResult.error?.message,
        status: lastResult.status,
      });
      perInterface.push({
        interface: iface,
        command,
        attempts,
        ok: false,
        durationMs: elapsedSince(interfaceStartedAtMs),
        code: lastResult.error?.code,
        message: lastResult.error?.message,
        status: lastResult.status,
        ...(rejectedAttempts.length > 0 ? { rejectedAttempts } : {}),
      });
      continue;
    }

    if (!lastBlock) {
      failed.push({
        interface: iface,
        command,
        code: "IOS_INTERFACE_BLOCK_NOT_FOUND",
        message: `La salida de "${command}" no contiene un bloque limpio que empiece con "${iface} is ...".`,
        status: lastResult.status,
      });
      perInterface.push({
        interface: iface,
        command,
        attempts,
        ok: false,
        durationMs: elapsedSince(interfaceStartedAtMs),
        code: "IOS_INTERFACE_BLOCK_NOT_FOUND",
        message: `La salida de "${command}" no contiene un bloque limpio que empiece con "${iface} is ...".`,
        status: lastResult.status,
        ...(rejectedAttempts.length > 0 ? { rejectedAttempts } : {}),
      });
      continue;
    }

    warnings.push(...mergeNonPartialWarnings(lastResult.warnings));
    succeeded.push(iface);
    blocks.push(lastBlock);
    perInterface.push({
      interface: iface,
      command,
      attempts,
      ok: true,
      durationMs: elapsedSince(interfaceStartedAtMs),
      status: lastResult.status,
      blockSource,
      ...(rejectedAttempts.length > 0 ? { rejectedAttempts } : {}),
    });
  }

  const output = blocks.join("\n\n").trim();

  return {
    ...discovery,
    ok: succeeded.length > 0,
    action: "ios.exec",
    device: options.device,
    deviceKind: "ios",
    command: "show interfaces",
    output,
    rawOutput: output,
    status: succeeded.length > 0 ? 0 : 1,
    error:
      succeeded.length > 0
        ? undefined
        : {
            code: "IOS_INTERFACES_COMPLETE_FAILED",
            message: "No se pudo obtener ninguna interfaz con show interfaces <iface>.",
            phase: "execution",
          },
    warnings: mergeWarnings(
      warnings,
      failed.length > 0
        ? [`${failed.length} interfaz(es) no pudieron recolectarse en modo completo.`]
        : [],
    ),
    evidence: mergeEvidence(
      discovery.evidence,
      buildCompleteInterfacesEvidence({
        startedAtMs,
        attemptedCommands,
        perInterface,
        enabled: true,
        discoveryCommand,
        interfaces,
        succeeded,
        failed,
        retryCount,
        partialGlobalAvoided: true,
      }),
    ),
  };
}
