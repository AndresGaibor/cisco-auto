import type { OmniRisk } from "@cisco-auto/pt-control/ports";

export type OmniOutputMode = "human" | "json" | "raw";

export interface OmniCliResult<T = unknown> {
  schemaVersion: "1.0";
  ok: boolean;
  action: string;
  capabilityId?: string;
  risk: OmniRisk;
  payload?: unknown;
  value?: T;
  error?: {
    code?: string;
    message: string;
  };
  warnings: string[];
  evidence?: Record<string, unknown>;
  confidence: number;
  nextSteps: string[];
}

export interface OmniRawOptions {
  file?: string;
  stdin?: boolean;
  wrap?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  unsafe?: boolean;
  raw?: boolean;
  save?: string;
  parseJson?: boolean;
  timeout?: string;
  guard?: "strict" | "warn" | "off";
}
