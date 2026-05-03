function getSuspiciousSyntaxContext(code: string): string {
  const lines = code.split(/\r?\n/);

  const suspiciousIndex = lines.findIndex((line, index) => {
    const trimmed = line.trim();

    if (/^catch\b/.test(trimmed)) {
      const prev = lines[index - 1]?.trim() ?? "";
      return !prev.endsWith("}") && !prev.endsWith("};");
    }

    return false;
  });

  const index = suspiciousIndex >= 0
    ? suspiciousIndex
    : lines.findIndex((line) => line.includes("catch (error)"));

  if (index < 0) {
    return "<no suspicious catch context found>";
  }

  const start = Math.max(0, index - 12);
  const end = Math.min(lines.length, index + 14);

  return lines
    .slice(start, end)
    .map((line, offset) => {
      const lineNo = start + offset + 1;
      const marker = lineNo === index + 1 ? ">>" : "  ";
      return `${marker} ${String(lineNo).padStart(5, " ")} | ${line}`;
    })
    .join("\n");
}

export function assertJavaScriptSyntaxOrThrow(label: string, code: string): void {
  try {
    new Function(code);
  } catch (error) {
    throw new Error(
      `${label} has invalid JavaScript syntax: ${
        error instanceof Error ? error.message : String(error)
      }\n\n${getSuspiciousSyntaxContext(code)}`,
    );
  }
}
