// ============================================================================
// Host Stabilize - Utilities for stabilizing PC/Server terminal sessions
// ============================================================================

import type { PTTerminal } from "./ios-session-utils";

export async function stabilizeHostPrompt(terminal: PTTerminal): Promise<void> {
  try {
    terminal.enterChar?.(3, 0);
  } catch {}

  try {
    terminal.enterChar?.(13, 0);
  } catch {}

  try {
    (terminal as any).flush?.();
  } catch {}

  await new Promise((resolve) => setTimeout(resolve, 250));
}

export function hostEchoLooksTruncated(output: string, expectedCommand: string): boolean {
  const expected = expectedCommand.trim().toLowerCase();
  const text = String(output ?? "").toLowerCase();

  if (expected.length < 2) return false;

  const withoutFirstChar = expected.slice(1);

  return text.includes(withoutFirstChar) && !text.includes(expected);
}
