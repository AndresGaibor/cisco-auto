import type { ParsedTerminalEvidence } from "./terminal-output-parsers.js";
import { verifyHostTerminalEvidence } from "./verifiers/host-evidence-verifier.js";
import { verifyIosTerminalEvidence } from "./verifiers/ios-evidence-verifier.js";
import type { TerminalEvidenceVerdict } from "./verifiers/evidence-verifier-types.js";

export type { TerminalEvidenceVerdict } from "./verifiers/evidence-verifier-types.js";

function baseVerdict(
  status: number,
  text: string,
): { executionOk: boolean; evidenceOk: boolean; confidence: number } {
  const executionOk = status === 0;
  const evidenceOk = text.trim().length > 0;

  if (!executionOk) {
    return { executionOk: false, evidenceOk: false, confidence: 0 };
  }

  if (!evidenceOk) {
    return { executionOk: true, evidenceOk: false, confidence: 0.2 };
  }

  return { executionOk: true, evidenceOk: true, confidence: 0.7 };
}

export function verifyTerminalEvidence(
  capabilityId: string,
  output: string,
  parsed: ParsedTerminalEvidence | null,
  status: number,
): TerminalEvidenceVerdict {
  const warnings: string[] = [];
  const text = String(output ?? "");
  const base = baseVerdict(status, text);

  if (!base.executionOk) {
    return {
      ok: false,
      reason: `Terminal status !=0 (${status})`,
      warnings,
      confidence: base.confidence,
      executionOk: false,
      evidenceOk: false,
    };
  }

  if (!base.evidenceOk) {
    return {
      ok: false,
      reason: "Output vacío",
      warnings,
      confidence: base.confidence,
      executionOk: true,
      evidenceOk: false,
    };
  }

  const iosVerdict = verifyIosTerminalEvidence(capabilityId, text, parsed, warnings);
  if (iosVerdict) {
    return iosVerdict;
  }

  const hostVerdict = verifyHostTerminalEvidence(capabilityId, text, parsed, warnings);
  if (hostVerdict) {
    return hostVerdict;
  }

  return {
    ok: true,
    warnings,
    confidence: base.confidence,
    executionOk: true,
    evidenceOk: true,
  };
}
