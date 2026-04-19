// Puerto para capacidades Omni (acceso de bajo nivel al kernel de PT)
// Define la interfaz de contrato para ejecutar capabilities privilegiadas

export type OmniRisk = "safe" | "elevated" | "dangerous" | "experimental";
export type OmniDomain = "script" | "assessment" | "scope" | "process" | "app" | "device";

export interface OmniPortOptions {
  risk?: OmniRisk;
  timeoutMs?: number;
}

export interface OmniPortResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence: number;
}

export interface OmniCapabilityMetadata {
  id: string;
  domain: OmniDomain;
  risk: OmniRisk;
  prerequisites?: string[];
  description?: string;
}

export interface RuntimeOmniPort {
  runOmniCapability(id: string, payload: unknown, options?: OmniPortOptions): Promise<OmniPortResult>;
  describeCapability(id: string): OmniCapabilityMetadata | null;
  cleanupCapability(id: string): Promise<void>;
}