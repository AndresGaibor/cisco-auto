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

  const index =
    suspiciousIndex >= 0
      ? suspiciousIndex
      : lines.findIndex((line) => line.includes("catch (error)"));

  if (index >= 0) {
    return formatContext(lines, index);
  }

  return findLikelySyntaxContext(lines);
}

function formatContext(lines: string[], index: number): string {
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

function findLikelySyntaxContext(lines: string[]): string {
  const likelyIndex = lines.findIndex((line) =>
    /hasOwnProperty\.call\(.*\)\s+[a-zA-Z_$][\w$]*\[/.test(line) ||
    /\bif\s*\([^)]*$/.test(line) ||
    /\bfor\s*\([^)]*$/.test(line),
  );

  if (likelyIndex >= 0) {
    return formatContext(lines, likelyIndex);
  }

  const nonEmpty = lines.findIndex((line) => line.trim().length > 0);
  if (nonEmpty >= 0) {
    return formatContext(lines, nonEmpty);
  }

  return "<no syntax context available>";
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
