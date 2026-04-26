// ============================================================================
// Config IOS Types
// ============================================================================

export interface ConfigIOSPayload {
  device: string;
  commands: string[];
  interactive?: boolean;
}

export interface ConfigIOSResult {
  device: string;
  commands: string[];
  executed: number;
  errors: string[];
  commandOutputs?: Array<{
    index: number;
    command: string;
    ok: boolean;
    output: string;
  }>;
}

export interface VerificationStep {
  kind: string;
  verifyCommand: string;
  assert: (
    raw: string,
    parsed: unknown,
    originalCommands: string[],
  ) => boolean;
}

export interface VerificationPlan {
  steps: VerificationStep[];
  hasVlan: boolean;
  hasInterface: boolean;
  hasRouting: boolean;
  hasAcl: boolean;
  hasStp: boolean;
  hasEtherchannel: boolean;
}