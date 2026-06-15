import { buildCommandResult, firstString } from "./command-result-mapper.js";

export function buildFailureResult(args: {
  result: unknown;
  reason: { code: string; message: string };
  output?: string;
  rawOutput?: string;
  status?: number;
  warnings?: unknown[];
  evidence?: unknown;
}) {
  const r = args.result as Record<string, unknown>;

  return buildCommandResult({
    ok: false,
    action: "ios.exec",
    device: String(r.device ?? ""),
    deviceKind: "ios",
    command: String(r.command ?? ""),
    output: args.output ?? firstString(r.output),
    rawOutput: args.rawOutput ?? firstString(r.rawOutput, r.output),
    status: args.status ?? Number(r.status ?? 1),
    error: {
      code: args.reason.code,
      message: args.reason.message,
      phase: "execution",
    },
    warnings: args.warnings ?? (Array.isArray(r.warnings) ? r.warnings : []),
    evidence: args.evidence ?? r.evidence,
  });
}

export function buildSuccessResult(args: {
  result: unknown;
  output: string;
  rawOutput?: string;
  status?: number;
  warnings?: unknown[];
  evidence?: unknown;
}) {
  const r = args.result as Record<string, unknown>;

  return buildCommandResult({
    ok: true,
    action: "ios.exec",
    device: String(r.device ?? ""),
    deviceKind: "ios",
    command: String(r.command ?? ""),
    output: args.output,
    rawOutput: args.rawOutput ?? firstString(r.rawOutput, args.output),
    status: args.status ?? Number(r.status ?? 0),
    warnings: args.warnings ?? (Array.isArray(r.warnings) ? r.warnings : []),
    evidence: args.evidence ?? r.evidence,
  });
}
