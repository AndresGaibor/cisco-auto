// Puerto para primitivas del runtime de Packet Tracer
// Abstrae la ejecución de primitivas (operaciones atómicas sobre dispositivos)

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

export function createPrimitivePort(config?: { defaultTimeout?: number }): RuntimePrimitivePort {
  const defaultTimeout = config?.defaultTimeout ?? 8000;

  return {
    async runPrimitive(id: string, payload: unknown, options?: PrimitivePortOptions): Promise<PrimitivePortResult> {
      const timeout = options?.timeoutMs ?? defaultTimeout;

      try {
        const result = await executePrimitive(id, payload, { timeout });
        return result;
      } catch (e) {
        return {
          ok: false,
          error: String(e),
          code: "PORT_EXECUTION_ERROR",
          confidence: 0,
        };
      }
    },

    validatePayload(id: string, payload: unknown): boolean {
      const validators: Record<string, (p: unknown) => boolean> = {
        "device.add": (p: any) => !!p?.model,
        "device.remove": (p: any) => !!p?.name,
        "device.list": () => true,
        "link.add": (p: any) => !!p?.device1 && !!p?.device2,
        "link.remove": (p: any) => !!p?.device && !!p?.port,
        "module.add": (p: any) => !!p?.device && !!p?.module,
        "module.remove": (p: any) => !!p?.device && !!p?.slot,
        "host.setIp": (p: any) => !!p?.device && !!p?.ip,
        "snapshot.topology": () => true,
        "snapshot.hardware": (p: any) => !!p?.device,
      };

      const validator = validators[id];
      return validator ? validator(payload) : true;
    },

    getPrimitiveMetadata(id: string): Record<string, unknown> | null {
      const metadata: Record<string, Record<string, unknown>> = {
        "device.add": { domain: "device", risk: "safe" },
        "device.remove": { domain: "device", risk: "safe" },
        "device.list": { domain: "device", risk: "safe" },
        "link.add": { domain: "link", risk: "safe" },
        "link.remove": { domain: "link", risk: "safe" },
        "module.add": { domain: "module", risk: "elevated" },
        "module.remove": { domain: "module", risk: "elevated" },
        "host.setIp": { domain: "host", risk: "safe" },
        "snapshot.topology": { domain: "snapshot", risk: "safe" },
        "snapshot.hardware": { domain: "snapshot", risk: "safe" },
      };

      return metadata[id] ?? null;
    },
  };
}

async function executePrimitive(id: string, payload: unknown, context: { timeout: number }): Promise<PrimitivePortResult> {
  return {
    ok: true,
    value: { id, payload, executedAt: Date.now() },
    confidence: 1,
  };
}