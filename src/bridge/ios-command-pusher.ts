// Enviar comandos IOS al bridge server con reintentos y timeout
export interface PushResult {
  success: boolean;
  commandId?: string;
  error?: string;
}

const BRIDGE_URL = "http://127.0.0.1:54321/execute";
const TIMEOUT_MS = 30_000; // 30 segundos
const RETRY_DELAYS = [1000, 2000, 4000]; // ms

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// Ejecuta el POST al bridge con un AbortController para timeout
async function doPost(body: unknown, timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController();

  // Si nos pasan una señal externa (p. ej. para tests), la enlazamos
  if (signal) {
    // Si la señal externa se aborta, abortamos también
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort());
  }

  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(BRIDGE_URL, {
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

// pushCommands - intenta enviar comandos IOS al bridge con reintentos
export async function pushCommands(
  deviceId: string,
  commands: string[],
): Promise<PushResult> {
  const payload = { tipo: "configurar", args: [deviceId, commands] };

  // Intento inicial + 3 reintentos con backoff
  const maxRetries = RETRY_DELAYS.length;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await doPost(payload, TIMEOUT_MS);

      // Si fetch lanza, caemos al catch. Aquí comprobamos el status
      if (!res.ok) {
        // Intentamos parsear el body de error si existe
        let errText = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          if (data && typeof data === "object" && "error" in data) {
            // @ts-ignore
            errText = String(data.error || errText);
          }
        } catch (_) {
          // ignore
        }
        throw new Error(errText);
      }

      const json: any = await res.json();
      if (json && json.success) {
        return { success: true, commandId: json.commandId };
      }

      return { success: false, error: json && json.error ? String(json.error) : "unknown" };
    } catch (err) {
      // Si estamos en el último intento, devolvemos error
      const isLast = attempt === maxRetries;
      const mensaje = err instanceof Error ? err.message : String(err);
      if (isLast) {
        return { success: false, error: mensaje };
      }

      // Esperar backoff antes del siguiente intento
      // Seleccionar delay seguro (si attempt excede índices, usar último valor)
      const idx = Math.min(attempt, RETRY_DELAYS.length - 1);
      const delayMs: number = RETRY_DELAYS[idx] as number;
      // eslint-disable-next-line no-await-in-loop
      await delay(delayMs);
      // y reintentar
    }
  }

  return { success: false, error: "failed" };
}

export default pushCommands;
