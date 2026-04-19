import type { DebugLogEntry } from "./debug-log-stream.js";

export type PtCommandTraceKind = "claim" | "dispatch" | "complete" | "error";

export interface ParsedPtCommandTraceEvent {
  kind: PtCommandTraceKind;
  timestamp: string;
  raw: string;
  claimVerb?: "claimed" | "parsed" | "reclaimed-from-commands" | "reclaimed-from-in-flight";
  cmdId?: string;
  commandType?: string;
  filename?: string;
  ok?: boolean;
  message?: string;
}

interface CommandBlock {
  cmdId: string;
  commandType?: string;
  filename?: string;
  opened: boolean;
}

export interface CommandTraceTracker {
  consume(entry: DebugLogEntry): string[];
}

function color(code: string, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function bold(text: string): string {
  return color("1", text);
}

function dim(text: string): string {
  return color("2", text);
}

function cyan(text: string): string {
  return color("36", text);
}

function blue(text: string): string {
  return color("34", text);
}

function green(text: string): string {
  return color("32", text);
}

function yellow(text: string): string {
  return color("33", text);
}

function red(text: string): string {
  return color("31", text);
}

function gray(text: string): string {
  return color("90", text);
}

function formatTime(timestamp: string): string {
  return timestamp.split("T")[1]?.split(".")[0] ?? timestamp;
}

function parseCommandIdFromFilename(filename: string): string | null {
  const match = filename.match(/^(\d+)-(.+)\.json$/i);
  if (!match) return null;
  return `cmd_${match[1]}`;
}

export function parsePtCommandTraceEvent(entry: DebugLogEntry): ParsedPtCommandTraceEvent | null {
  const raw = entry.message.replace(/^\[(runtime|kernel|queue|loader|exec)\]\s*/i, "").trim();

  const claim = raw.match(
    /^(?:\[queue-claim\]\s+)?(claimed|parsed|reclaimed from commands|reclaimed from in-flight):\s+(.+)$/i,
  );
  if (claim) {
    const claimVerb = claim[1]?.trim().toLowerCase();
    const filename = claim[2]?.trim();
    const cmdId = filename ? (parseCommandIdFromFilename(filename) ?? undefined) : undefined;
    const commandType = filename
      ? filename.replace(/^\d+-/, "").replace(/\.json$/i, "")
      : undefined;
    return {
      kind: "claim",
      timestamp: entry.timestamp,
      raw,
      claimVerb:
        claimVerb === "parsed"
          ? "parsed"
          : claimVerb === "claimed"
            ? "claimed"
            : claimVerb === "reclaimed from commands"
              ? "reclaimed-from-commands"
              : "reclaimed-from-in-flight",
      cmdId,
      commandType,
      filename,
    };
  }

  const dispatch = raw.match(/^>>>\s*DISPATCH:\s*(cmd_[^\s]+)\s+type=([^\s]+)/i);
  if (dispatch) {
    return {
      kind: "dispatch",
      timestamp: entry.timestamp,
      raw,
      cmdId: dispatch[1],
      commandType: dispatch[2],
    };
  }

  const completing = raw.match(/^<<<\s*COMPLETING:\s*(cmd_[^\s]+)\s+ok=(true|false)/i);
  if (completing) {
    return {
      kind: "complete",
      timestamp: entry.timestamp,
      raw,
      cmdId: completing[1],
      ok: completing[2] === "true",
    };
  }

  const fatal = raw.match(
    /(?:RUNTIME FATAL ERROR|RUNTIME NOT LOADED|LOAD ERROR|claim failed|invalid command|reclaim failed)/i,
  );
  if (fatal) {
    return {
      kind: "error",
      timestamp: entry.timestamp,
      raw,
      message: raw,
    };
  }

  return null;
}

function renderHeader(block: CommandBlock, timestamp: string): string {
  const time = formatTime(timestamp);
  const commandType = block.commandType ? ` ${cyan(block.commandType)}` : "";
  const filename = block.filename ? ` ${dim(block.filename)}` : "";
  return `${gray(`[${time}]`)} ${cyan(" CMD ")} ${bold(block.cmdId)}${commandType}${filename}`.trim();
}

function renderClaimLine(event: ParsedPtCommandTraceEvent): string {
  const filename = event.filename ? dim(event.filename) : "";
  return `${gray("      ↳")} ${yellow(" QUEUE ")} claimed ${filename}`.trim();
}

function renderDispatchLine(event: ParsedPtCommandTraceEvent): string {
  const commandType = event.commandType ? cyan(`type=${event.commandType}`) : "";
  return `${gray("      ↳")} ${blue(" PT ")} dispatch ${commandType}`.trim();
}

function renderCompleteLine(event: ParsedPtCommandTraceEvent): string {
  const badge = event.ok ? green(" OK ") : red(" ERR ");
  const tail = event.ok ? "completed" : "completing failed";
  return `${gray("      ↳")} ${badge} ${tail} ${event.cmdId ? dim(event.cmdId) : ""}`.trim();
}

function renderErrorLine(event: ParsedPtCommandTraceEvent): string {
  return `${gray("      ↳")} ${red(" ERR ")} ${dim(event.message ?? event.raw)}`.trim();
}

function renderEventLine(event: ParsedPtCommandTraceEvent): string {
  switch (event.kind) {
    case "claim":
      return renderClaimLine(event);
    case "dispatch":
      return renderDispatchLine(event);
    case "complete":
      return renderCompleteLine(event);
    case "error":
      return renderErrorLine(event);
  }
}

export function createCommandTraceTracker(): CommandTraceTracker {
  const blocks = new Map<string, CommandBlock>();
  const seenClaims = new Set<string>();

  return {
    consume(entry: DebugLogEntry): string[] {
      const parsed = parsePtCommandTraceEvent(entry);
      if (!parsed) return [];

      if (parsed.kind === "error" || !parsed.cmdId) {
        return [renderErrorLine(parsed)];
      }

      if (parsed.kind === "claim") {
        const claimKey = parsed.cmdId ?? parsed.filename ?? parsed.raw;
        if (seenClaims.has(claimKey) && parsed.claimVerb === "parsed") {
          return [];
        }
        seenClaims.add(claimKey);
      }

      const block = blocks.get(parsed.cmdId) ?? {
        cmdId: parsed.cmdId,
        opened: false,
      };

      if (parsed.commandType && !block.commandType) {
        block.commandType = parsed.commandType;
      }

      if (parsed.filename && !block.filename) {
        block.filename = parsed.filename;
      }

      const lines: string[] = [];
      if (!block.opened) {
        block.opened = true;
        lines.push(renderHeader(block, parsed.timestamp));
      }

      lines.push(renderEventLine(parsed));
      blocks.set(parsed.cmdId, block);
      return lines;
    },
  };
}
