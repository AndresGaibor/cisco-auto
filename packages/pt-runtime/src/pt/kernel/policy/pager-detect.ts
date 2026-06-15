export function isPagerOnlyLine(line: string): boolean {
  return /^--More--$/i.test(String(line ?? "").trim());
}

export function outputHasPager(output: string): boolean {
  return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
}

export function nativeOutputTailHasActivePager(output: string): boolean {
  const tail = normalizeEol(output).slice(-800);

  if (!tail.trim()) {
    return false;
  }

  return /--More--\s*$/i.test(tail) || /\s--More--\s*$/i.test(tail);
}

function normalizeEol(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
