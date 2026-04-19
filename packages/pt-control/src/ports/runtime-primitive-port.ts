// Puerto para primitivas del runtime de Packet Tracer
// Abstrae la ejecución de primitivas (operaciones atómicas sobre dispositivos)
// La implementación concreta vive en: src/adapters/runtime-primitive-adapter.ts

export interface PrimitivePortOptions {
  timeoutMs?: number;
  retries?: number;
}

export interface PrimitivePortResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

export interface RuntimePrimitivePort {
  runPrimitive(id: string, payload: unknown, options?: PrimitivePortOptions): Promise<PrimitivePortResult>;
  validatePayload(id: string, payload: unknown): boolean;
  getPrimitiveMetadata(id: string): Record<string, unknown> | null;
}