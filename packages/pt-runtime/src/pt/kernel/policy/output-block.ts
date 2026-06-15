export function normalizeEol(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function lastNonEmptyLine(value: unknown): string {
  const lines = normalizeEol(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines[lines.length - 1] : "";
}

export function appendStepOutput(current: string, next: unknown): string {
  const value = String(next ?? "");

  if (!value.trim()) {
    return current;
  }

  if (!current.trim()) {
    return value;
  }

  return current.replace(/\s+$/g, "") + "\n" + value.replace(/^\s+/g, "");
}
