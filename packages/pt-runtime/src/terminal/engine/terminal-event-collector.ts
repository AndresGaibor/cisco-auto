// ============================================================================
// Terminal Event Collector - Colección de eventos del terminal
// ============================================================================
// Gestiona el buffer de output y la colección de eventos de terminal.
// Las funciones pushEvent y compactTerminalEvents fueron extraídas de
// command-executor.ts para separar responsabilidades.

import type { TerminalEventRecord } from "../../pt/terminal/terminal-events";
import { normalizePrompt } from "../prompt-detector";

/**
 * Interfaz pública del coleccionador de eventos de terminal.
 */
export interface TerminalEventCollector {
  events: TerminalEventRecord[];
  outputBuffer: string;
  outputEventsCount: number;
  push(eventType: string, raw: string, normalized?: string): void;
  appendOutput(chunk: string): void;
  compact(): TerminalEventRecord[];
}

/**
 * Crea un coleccionador de eventos de terminal.
 * Mantiene el estado de eventos y buffer de output.
 */
export function createTerminalEventCollector(
  sessionId: string,
  deviceName: string
): TerminalEventCollector {
  const events: TerminalEventRecord[] = [];
  let outputBuffer = "";
  let outputEventsCount = 0;

  return {
    get events() {
      return events;
    },
    get outputBuffer() {
      return outputBuffer;
    },
    get outputEventsCount() {
      return outputEventsCount;
    },
    push(eventType: string, raw: string, normalized?: string): void {
      events.push({
        sessionId,
        deviceName,
        eventType,
        timestamp: Date.now(),
        raw,
        normalized: normalized ?? normalizePrompt(raw),
      });
    },
    appendOutput(chunk: string): void {
      outputBuffer += chunk;
      outputEventsCount++;
    },
    compact(): TerminalEventRecord[] {
      return compactTerminalEvents(events);
    },
  };
}

/**
 * Registra un evento en la colección de eventos del terminal.
 * Extraído de command-executor.ts lines 101-117.
 */
export function pushEvent(
  events: TerminalEventRecord[],
  sessionId: string,
  deviceName: string,
  eventType: string,
  raw: string,
  normalized?: string,
): void {
  events.push({
    sessionId,
    deviceName,
    eventType,
    timestamp: Date.now(),
    raw,
    normalized: normalized ?? normalizePrompt(raw),
  });
}

/**
 * Compacta eventos de output adyacentes en un solo evento outputWritten.
 * Reduces the number of events by merging consecutive outputWritten events.
 * Extraído de command-executor.ts lines 186-222.
 */
export function compactTerminalEvents(events: TerminalEventRecord[]): TerminalEventRecord[] {
  const compacted: TerminalEventRecord[] = [];
  let buffer = "";

  for (const event of events) {
    if (event.eventType === "outputWritten") {
      buffer += event.raw;
      continue;
    }

    if (buffer) {
      compacted.push({
        ...event,
        eventType: "outputWritten",
        raw: buffer,
        normalized: buffer.trim(),
        timestamp: event.timestamp,
      });
      buffer = "";
    }

    compacted.push(event);
  }

  if (buffer) {
    compacted.push({
      sessionId: events[events.length - 1]?.sessionId ?? "",
      deviceName: events[events.length - 1]?.deviceName ?? "",
      eventType: "outputWritten",
      timestamp: events[events.length - 1]?.timestamp ?? Date.now(),
      raw: buffer,
      normalized: buffer.trim(),
    });
  }

  return compacted;
}