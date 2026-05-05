import { parseTerminalOutput } from "../../../pt/terminal/terminal-output-parsers.js";
import { verifyTerminalEvidence } from "../../../pt/terminal/terminal-evidence-verifier.js";

export function inferTerminalCapabilityId(command: string): string | null {
  const normalized = String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  if (/^show\s+running-config$/.test(normalized)) return "terminal.show-running-config";
  if (/^show\s+startup-config$/.test(normalized)) return "terminal.show-startup-config";
  if (/^show\s+version$/.test(normalized)) return "terminal.show-version";
  if (/^show\s+ip\s+interface\s+brief$/.test(normalized)) return "terminal.show-ip-interface-brief";
  if (/^show\s+vlan(?:\s+brief)?$/.test(normalized)) return "terminal.show-vlan-brief";
  if (/^show\s+cdp\s+neighbors$/.test(normalized)) return "terminal.show-cdp-neighbors";
  if (/^show\s+ip\s+route$/.test(normalized)) return "terminal.show-ip-route";
  if (/^show\s+access-lists?$/.test(normalized)) return "terminal.show-access-lists";

  return null;
}

export function applyTerminalEvidenceBarrier(input: {
  command: string;
  rawOutput: string;
}): { override: boolean; error?: { code: string; message: string; warnings: string[] } } {
  const capabilityId = inferTerminalCapabilityId(input.command);

  if (!capabilityId) {
    return { override: false };
  }

  const parsed = parseTerminalOutput(capabilityId, input.rawOutput);
  const verdict = verifyTerminalEvidence(capabilityId, input.rawOutput, parsed, 0);

  if (verdict.evidenceOk) {
    return { override: false };
  }

  return {
    override: true,
    error: {
      code: "IOS_OUTPUT_COMMAND_MISMATCH",
      message: verdict.reason ?? "La salida no corresponde al comando ejecutado",
      warnings: verdict.warnings,
    },
  };
}
