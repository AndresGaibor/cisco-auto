// ============================================================================
// Primitive Registry — Registro único de primitives
// ============================================================================

export type PrimitiveDomain = "device" | "link" | "module" | "host" | "snapshot";

export type PrimitiveResult = {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
};

export interface PrimitiveEntry<T = unknown> {
  id: string;
  domain: PrimitiveDomain;
  implementation: (payload: T, context: PrimitiveContext) => PrimitiveResult;
  payloadValidator?: (payload: unknown) => boolean;
}

export interface PrimitiveContext {
  net: any;
  lw: any;
}

const primitiveRegistry = new Map<string, PrimitiveEntry>();

export function registerPrimitive<T>(entry: PrimitiveEntry<T>): void {
  if (primitiveRegistry.has(entry.id)) {
    throw new Error(`Duplicate primitive id: ${entry.id}`);
  }
  primitiveRegistry.set(entry.id, entry as PrimitiveEntry);
}

export function getPrimitive(id: string): PrimitiveEntry | undefined {
  return primitiveRegistry.get(id);
}

export function listPrimitives(): string[] {
  return Array.from(primitiveRegistry.keys());
}

export function getPrimitivesByDomain(domain: PrimitiveDomain): string[] {
  const result: string[] = [];
  for (const [id, entry] of primitiveRegistry) {
    if (entry.domain === domain) {
      result.push(id);
    }
  }
  return result;
}

export function executePrimitive<T>(id: string, payload: T, context: PrimitiveContext): PrimitiveResult {
  const primitive = primitiveRegistry.get(id);
  if (!primitive) {
    return { ok: false, error: `Unknown primitive: ${id}`, code: "PRIMITIVE_NOT_FOUND", confidence: 0 };
  }
  if (primitive.payloadValidator && !primitive.payloadValidator(payload)) {
    return { ok: false, error: `Invalid payload for ${id}`, code: "INVALID_PAYLOAD", confidence: 0 };
  }
  return primitive.implementation(payload, context);
}