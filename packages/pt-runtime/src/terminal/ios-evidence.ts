// ============================================================================
// IOS Evidence - Builder de evidencia para executions
// ============================================================================

import type { TerminalSessionState, TerminalMode } from "./session-state";
import { getSession } from "./session-registry";
import type { TerminalEventRecord } from "../pt/terminal/terminal-events";

export interface TerminalExecutionEvidence {
  sessionSnapshotBefore: SessionSnapshot;
  sessionSnapshotAfter: SessionSnapshot;
  promptBefore: string;
  promptAfter: string;
  modeBefore: TerminalMode;
  modeAfter: TerminalMode;
  command: string;
  rawOutput: string;
  normalizedOutput: string;
  events: TerminalEventRecord[];
  pagerAdvances: number;
  wizardInterventions: number;
  confirmationsAnswered: number;
  warnings: string[];
  anomalies: string[];
}

interface SessionSnapshot {
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
  pagerActive?: boolean;
  confirmPromptActive?: boolean;
}

export function buildEvidence(
  deviceName: string,
  command: string,
  output: string,
  promptBefore: string,
  promptAfter: string,
  modeBefore: TerminalMode,
  modeAfter: TerminalMode,
  events: TerminalEventRecord[],
  warnings: string[] = []
): TerminalExecutionEvidence {
  const session = getSession(deviceName);

  const sessionBefore: SessionSnapshot = session
    ? {
        mode: session.lastMode,
        prompt: session.lastPrompt,
        paging: session.pagerActive,
        awaitingConfirm: session.confirmPromptActive,
      }
    : { mode: "unknown", prompt: "", paging: false, awaitingConfirm: false };

  const sessionAfter: SessionSnapshot = session
    ? {
        mode: session.lastMode,
        prompt: session.lastPrompt,
        paging: session.pagerActive,
        awaitingConfirm: session.confirmPromptActive,
      }
    : { mode: modeAfter, prompt: promptAfter, paging: false, awaitingConfirm: false };

  const pagerAdvances = events.filter((e) => e.eventType === "moreDisplayed").length;
  const wizardInterventions = events.filter((e) => e.normalized?.includes("wizard")).length;
  const confirmations = events.filter((e) => e.normalized?.includes("yes/no")).length;

  const anomalies: string[] = [];
  if (output.includes("--More--") && pagerAdvances === 0) {
    anomalies.push("Pager detected but not advanced");
  }
  if (modeBefore !== modeAfter && command.trim() !== "") {
    const modeKeywords = ["enable", "disable", "configure"];
    const changedMode = modeKeywords.some((kw) => command.toLowerCase().includes(kw));
    if (!changedMode) {
      anomalies.push(`Mode changed without mode-change command: ${modeBefore} -> ${modeAfter}`);
    }
  }

  return {
    sessionSnapshotBefore: sessionBefore,
    sessionSnapshotAfter: sessionAfter,
    promptBefore,
    promptAfter,
    modeBefore,
    modeAfter,
    command,
    rawOutput: output,
    normalizedOutput: output.trim(),
    events,
    pagerAdvances,
    wizardInterventions,
    confirmationsAnswered: confirmations,
    warnings,
    anomalies,
  };
}

export function hasValidEvidence(evidence: TerminalExecutionEvidence): boolean {
  return (
    !!evidence.command &&
    (!!evidence.rawOutput || evidence.events.length > 0)
  );
}

export function calculateConfidence(evidence: TerminalExecutionEvidence): number {
  let score = 0.5;

  if (hasValidEvidence(evidence)) score += 0.2;
  if (evidence.events.some((e) => e.eventType === "commandEnded")) score += 0.15;
  if (evidence.events.some((e) => e.eventType === "outputWritten")) score += 0.1;
  if (evidence.anomalies.length === 0) score += 0.05;

  return Math.min(1, score);
}