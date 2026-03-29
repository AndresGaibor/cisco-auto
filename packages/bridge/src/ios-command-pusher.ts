import { type QueuePacket } from './schemas.ts';

// Tipos para la respuesta del servidor bridge
interface BridgeResponse {
  ok: boolean;
  queued?: boolean;
  packet?: {
    id?: string;
  };
  error?: string;
}

// Enviar comandos IOS al bridge server con reintentos y timeout
export interface PushResult {
  success: boolean;
  commandId?: string;
  error?: string;
}

const BRIDGE_BASE_URL = "http://127.0.0.1:54321";
const TIMEOUT_MS = 30_000; // 30 segundos
const RETRY_DELAYS = [1000, 2000, 4000]; // ms

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// Ejecuta el POST al bridge con un AbortController para timeout
async function doPost(path: string, body: unknown, timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController();

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort());
  }

  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BRIDGE_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * pushCommands - intenta enviar comandos IOS al bridge con reintentos.
 * Utiliza el nuevo protocolo de bridge basado en /queue/eval.
 */
export async function pushCommands(
  deviceId: string,
  commands: string[],
): Promise<PushResult> {
  // Convertir array de comandos en un bloque de código JS para PTBuilder
  // PTBuilder espera configureIosDevice(name, commands_string_with_newlines)
  const iosCode = `configureIosDevice(${JSON.stringify(deviceId)}, ${JSON.stringify(commands.join('\n'))});`;
  
  const payload = { code: iosCode };

  const maxRetries = RETRY_DELAYS.length;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await doPost("/queue/eval", payload, TIMEOUT_MS);

      if (!res.ok) {
        let errText = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          if (data && typeof data === "object" && "error" in data) {
            errText = String(data.error || errText);
          }
        } catch (_) {
          // ignore
        }
        throw new Error(errText);
      }

      const json = (await res.json()) as BridgeResponse;
      if (json && json.ok && json.queued) {
        return { success: true, commandId: json.packet?.id };
      }

      return { success: false, error: json && json.error ? String(json.error) : "unknown" };
    } catch (err) {
      const isLast = attempt === maxRetries;
      const mensaje = err instanceof Error ? err.message : String(err);
      if (isLast) {
        return { success: false, error: mensaje };
      }

      const idx = Math.min(attempt, RETRY_DELAYS.length - 1);
      const delayMs: number = RETRY_DELAYS[idx] as number;
      await delay(delayMs);
    }
  }

  return { success: false, error: "failed" };
}

export default pushCommands;
