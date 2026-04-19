export interface IosExecutionEvidence {
  source: string;
  raw: string;
  command?: string;
  device?: string;
  status?: number;
  mode?: string;
  prompt?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
  paging?: boolean;
  awaitingConfirm?: boolean;
  autoDismissedInitialDialog?: boolean;
  completionReason?: string;
}

export interface IosExecutionSuccess<T = unknown> {
  ok: boolean;
  raw: string;
  value?: T;
  parsed?: T;
  status?: number;
  mode?: string;
  evidence?: IosExecutionEvidence;
}

export interface IosConfigApplyResult {
  ok: boolean;
  raw: string;
  executed: boolean;
  device: string;
  commands: string[];
  results: Array<{ index: number; command: string; ok: boolean; output: string }>;
  warnings?: string[];
  evidence?: IosExecutionEvidence;
}

export type IosConfidence = "non_terminal" | "executed" | "unverified" | "verified";

export function deriveIosConfidence(
  evidence: IosExecutionEvidence,
  verification: { verified?: boolean } | boolean,
): IosConfidence {
  if (evidence.source !== "terminal") return "non_terminal";
  if (typeof verification === "boolean") return verification ? "verified" : "executed";
  if (verification.verified === true) return "verified";
  if (verification.verified === false) return "executed";
  return "unverified";
}