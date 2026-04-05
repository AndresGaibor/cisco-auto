// Verification result contract for PT Control

export interface VerificationCheck {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
}

export interface VerificationResult {
  executed: boolean; // indicates if verification commands were executed (shows ran)
  verified: boolean; // true if all required checks passed
  partiallyVerified?: boolean;
  verificationSource?: string[]; // list of show commands used
  warnings?: string[];
  checks?: VerificationCheck[];
}
