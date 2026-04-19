// ============================================================================
// Omni Registry — Registro único de omni adapters
// ============================================================================

export type OmniRisk = "safe" | "elevated" | "dangerous" | "experimental";
export type OmniDomain = "script" | "assessment" | "scope" | "process" | "app" | "device";

export interface OmniResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence: number;
}

export interface OmniAdapterEntry {
  id: string;
  domain: OmniDomain;
  risk: OmniRisk;
  prerequisites?: string[];
  implementation: (payload: unknown, context: OmniContext) => Promise<OmniResult>;
}

export interface OmniContext {
  ipc: any;
  global: any;
  assessment?: any;
  app?: any;
  device?: any;
}

const omniRegistry = new Map<string, OmniAdapterEntry>();

export function registerOmniAdapter(entry: OmniAdapterEntry): void {
  if (omniRegistry.has(entry.id)) {
    throw new Error(`Duplicate omni adapter id: ${entry.id}`);
  }
  omniRegistry.set(entry.id, entry);
}

export function getOmniAdapter(id: string): OmniAdapterEntry | undefined {
  return omniRegistry.get(id);
}

export function listOmniAdapters(): string[] {
  return Array.from(omniRegistry.keys());
}

export function getOmniAdaptersByDomain(domain: OmniDomain): string[] {
  const result: string[] = [];
  for (const [id, entry] of omniRegistry) {
    if (entry.domain === domain) {
      result.push(id);
    }
  }
  return result;
}

export function getOmniAdaptersByRisk(risk: OmniRisk): string[] {
  const result: string[] = [];
  for (const [id, entry] of omniRegistry) {
    if (entry.risk === risk) {
      result.push(id);
    }
  }
  return result;
}

export async function executeOmniAdapter(
  id: string,
  payload: unknown,
  context: OmniContext
): Promise<OmniResult> {
  const adapter = omniRegistry.get(id);
  if (!adapter) {
    return { ok: false, error: `Unknown adapter: ${id}`, code: "ADAPTER_NOT_FOUND", confidence: 0 };
  }
  return adapter.implementation(payload, context);
}