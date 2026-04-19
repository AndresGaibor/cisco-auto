// Puerto para capacidades Omni (acceso de bajo nivel al kernel de PT)
// Permite operaciones privilegiadas y acceso directo a la memoria del simulador

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

export interface OmniAdapterMetadata {
  id: string;
  domain: OmniDomain;
  risk: OmniRisk;
  prerequisites?: string[];
  description?: string;
}

export interface RuntimeOmniPort {
  runOmniCapability(id: string, payload: unknown, options?: OmniPortOptions): Promise<OmniPortResult>;
  getAdapterMetadata(id: string): OmniAdapterMetadata | null;
  getPrerequisites(id: string): string[];
}

export function createOmniPort(config?: { defaultTimeout?: number }): RuntimeOmniPort {
  const defaultTimeout = config?.defaultTimeout ?? 8000;

  return {
    async runOmniCapability(id: string, payload: unknown, options?: OmniPortOptions): Promise<OmniPortResult> {
      const timeout = options?.timeoutMs ?? defaultTimeout;
      const risk = options?.risk ?? "safe";

      const riskGates: Record<OmniRisk, boolean> = {
        safe: true,
        elevated: risk === "elevated" || risk === "safe",
        dangerous: risk === "dangerous",
        experimental: false,
      };

      if (!riskGates[risk]) {
        return {
          ok: false,
          error: `Risk ${risk} not permitted`,
          code: "RISK_BLOCKED",
          confidence: 0,
        };
      }

      try {
        const result = await executeOmniCapability(id, payload, { timeout, risk });
        return result;
      } catch (e) {
        return {
          ok: false,
          error: String(e),
          code: "OMNI_EXECUTION_ERROR",
          confidence: 0,
        };
      }
    },

    getAdapterMetadata(id: string): OmniAdapterMetadata | null {
      const metadata: Record<string, OmniAdapterMetadata> = {
        "omni.evaluate": { id: "omni.evaluate", domain: "script", risk: "dangerous", description: "Evaluar código arbitrario" },
        "omni.siphon": { id: "omni.siphon", domain: "assessment", risk: "elevated", description: "Leer assessment items" },
        "omni.global": { id: "omni.global", domain: "scope", risk: "safe", description: "Acceder a globals de PT" },
        "omni.process": { id: "omni.process", domain: "process", risk: "elevated", description: "Obtener procesos" },
        "omni.environment": { id: "omni.environment", domain: "app", risk: "safe", description: "Info del environment" },
        "omni.serialize": { id: "omni.serialize", domain: "device", risk: "safe", description: "Serializar dispositivo" },
      };

      return metadata[id] ?? null;
    },

    getPrerequisites(id: string): string[] {
      const prereqs: Record<string, string[]> = {
        "omni.evaluate": [],
        "omni.siphon": ["assessment"],
        "omni.global": [],
        "omni.process": ["device"],
        "omni.environment": [],
        "omni.serialize": ["device"],
      };

      return prereqs[id] ?? [];
    },
  };
}

async function executeOmniCapability(
  id: string,
  payload: unknown,
  context: { timeout: number; risk: OmniRisk }
): Promise<OmniPortResult> {
  return {
    ok: true,
    value: { id, payload, executedAt: Date.now() },
    confidence: 1,
  };
}