const MAX_EVENTOS = 500;

let eventos: string[] = [];
let seqActual = 0;
let logsDir: string = "";

export function initDebugLog(dir: string): void {
  logsDir = dir;
}

export function writeDebugLog(scope: string, mensaje: string, nivel: string = "debug"): void {
  if (!logsDir) return;

  seqActual++;

  const evento = JSON.stringify({
    seq: seqActual,
    timestamp: new Date().toISOString(),
    scope,
    message: mensaje,
    level: nivel,
  });

  eventos.push(evento);

  if (eventos.length > MAX_EVENTOS) {
    eventos = eventos.slice(-MAX_EVENTOS);
  }

  try {
    const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
    const fm = scope.safeFM?.();
    if (!fm?.fm?.writePlainTextToFile) return;

    const contenido = eventos.join("\n") + (eventos.length > 0 ? "\n" : "");
    fm.fm.writePlainTextToFile(logsDir + "/pt-debug.current.ndjson", contenido);
  } catch {
    // Silencio absoluto si fm no estÃ¡ disponible
  }
}

export function limpiarDebugLog(): void {
  eventos = [];
  seqActual = 0;
}
