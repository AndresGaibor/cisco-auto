import { readFileSync, existsSync } from "node:fs";
import { PTEventSchema, type PTEvent } from "@cisco-auto/types/schemas/pt-events";

export interface EventReadOptions {
  /** Skip invalid lines instead of throwing */
  skipInvalid?: boolean;
}

export interface EventSummary {
  total: number;
  counts: Record<string, number>;
  latest: PTEvent | null;
}

/**
 * Parsea una línea NDJSON de evento.
 * @param line - Línea de texto a parsear
 * @returns El evento parseado o null si es inválido
 */
export function parseEventLine(line: string): PTEvent | null {
  try {
    const parsed = JSON.parse(line);
    return PTEventSchema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Lee y parsea eventos desde un archivo NDJSON de eventos.
 * @param filePath - Ruta al archivo de eventos
 * @param options - Opciones de lectura (skipInvalid para saltar líneas inválidas)
 * @returns Array de eventos parseados
 */
export function readEvents(filePath: string, options: EventReadOptions = {}): PTEvent[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  const events: PTEvent[] = [];

  for (const line of lines) {
    const parsed = parseEventLine(line);
    if (parsed) {
      events.push(parsed);
    } else if (!options.skipInvalid) {
      throw new Error(`Invalid NDJSON line: ${line}`);
    }
  }

  return events;
}

/**
 * Genera un resumen de eventos por tipo.
 * @param events - Array de eventos a resumir
 * @returns Resumen con totales, conteos por tipo y último evento
 */
export function summarizeEvents(events: PTEvent[]): EventSummary {
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }

  const latest = events.length ? events[events.length - 1]! : null;
  return { total: events.length, counts, latest };
}

/**
 * Obtiene los últimos N eventos de un array.
 * @param events - Array de eventos
 * @param limit - Número de eventos a retornar desde el final
 * @returns Array con los últimos N eventos
 */
export function tailEvents(events: PTEvent[], limit: number): PTEvent[] {
  if (limit <= 0) return events;
  return events.slice(-limit);
}
