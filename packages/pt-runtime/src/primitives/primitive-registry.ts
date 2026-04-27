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

const primitiveRegistry: Record<string, PrimitiveEntry> = {};

export function registerPrimitive<T>(entry: PrimitiveEntry<T>): void {
  if (primitiveRegistry[entry.id]) {
    throw new Error(`Duplicate primitive id: ${entry.id}`);
  }
  primitiveRegistry[entry.id] = entry as PrimitiveEntry;
}

export function getPrimitive(id: string): PrimitiveEntry | undefined {
  return primitiveRegistry[id];
}

export function listPrimitives(): string[] {
  return Object.keys(primitiveRegistry);
}

export function getPrimitivesByDomain(domain: PrimitiveDomain): string[] {
  const result: string[] = [];
  const ids = Object.keys(primitiveRegistry);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const entry = primitiveRegistry[id];
    if (entry.domain === domain) result.push(id);
  }
  return result;
}

export function executePrimitive<T>(id: string, payload: T, context: PrimitiveContext): PrimitiveResult {
  const primitive = primitiveRegistry[id];
  if (!primitive) {
    return { ok: false, error: `Unknown primitive: ${id}`, code: "PRIMITIVE_NOT_FOUND", confidence: 0 };
  }
  if (primitive.payloadValidator && !primitive.payloadValidator(payload)) {
    return { ok: false, error: `Invalid payload for ${id}`, code: "INVALID_PAYLOAD", confidence: 0 };
  }
  return primitive.implementation(payload, context);
}
