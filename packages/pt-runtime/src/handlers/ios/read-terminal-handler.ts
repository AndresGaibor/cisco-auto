// ============================================================================
// Read Terminal Handler - Diagnostic terminal read
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import { createErrorResult, createSuccessResult } from "../result-factories";
import { readTerminalOutput } from "../../terminal/prompt-detector";
import { getSession } from "../../terminal/session-registry";
import { getTerminalDevice } from "./ios-session-utils";

export function handleReadTerminal(payload: { device: string }, api: PtRuntimeApi): PtResult {
  const terminal = getTerminalDevice(api, payload.device);
  if (!terminal) return createErrorResult("Terminal inaccessible", "NO_TERMINAL");

  const raw = readTerminalOutput(terminal);
  const session = getSession(payload.device);

  // Descubrimiento de métodos (force test some common ones since for..in might fail on Qt objects)
  const allProps: string[] = [];
  try {
    const keys = Object.keys(terminal);
    for (var j = 0; j < keys.length; j++) {
      allProps.push(keys[j] + " (keys)");
    }
  } catch(e) {}

  try {
    for (var k in terminal) {
      allProps.push(k + " (in)");
    }
  } catch(e) {}

  const methodsToTest = ["getOutput", "getAllOutput", "getBuffer", "getText", "getHistory", "history", "getCommandInput", "getConsole", "readAll", "read", "toString", "className", "objectName"];
  for (var i = 0; i < methodsToTest.length; i++) {
    var m = methodsToTest[i];
    try {
      if (m !== undefined && terminal[m as keyof typeof terminal] !== undefined) {
        allProps.push(m + " (exists)");
      }
    } catch(e) {
      allProps.push(m + " (throws)");
    }
  }

  return createSuccessResult({
    raw,
    device: payload.device,
    prompt: terminal.getPrompt ? terminal.getPrompt() : "",
    methods: allProps,
    history: session ? session.history : [],
  });
}
