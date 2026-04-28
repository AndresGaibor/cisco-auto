export interface CleanCmdOutputOptions {
  command: string;
  output: string;
  deviceKind: string;
  includeSyslogs?: boolean;
}

export interface CleanCmdOutputResult {
  output: string;
  rawOutput: string;
  warnings: string[];
  removedLineCount: number;
}

const IOS_SYSLOG_PATTERN = /^%[A-Z0-9_-]+-\d-[A-Z0-9_-]+:\s+/i;

function normalizeLineEndings(value: string): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function stripAnsi(value: string): string {
  return value
    .replace(/\u0007/g, "")
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/[\b]/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function commandLines(command: string): string[] {
  return normalizeLineEndings(command)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function matchesCommandEcho(line: string, command: string): boolean {
  const normalizedLine = line.trim();
  const lines = commandLines(command);

  if (lines.length === 0) return false;

  const fullCommand = lines.join(" ; ");
  const lastCommand = lines.at(-1)!;

  return (
    new RegExp(`^${escapeRegExp(lastCommand)}\\s*$`, "i").test(normalizedLine) ||
    new RegExp(`^${escapeRegExp(fullCommand)}\\s*$`, "i").test(normalizedLine) ||
    lines.some((cmd) => new RegExp(`^${escapeRegExp(cmd)}\\s*$`, "i").test(normalizedLine))
  );
}

function removeLeadingCommandEcho(lines: string[], command: string): { lines: string[]; removed: number } {
  let removed = 0;
  let index = 0;

  while (index < lines.length && !lines[index]?.trim()) {
    index++;
    removed++;
  }

  while (index < lines.length && matchesCommandEcho(lines[index] ?? "", command)) {
    index++;
    removed++;
  }

  return {
    lines: lines.slice(index),
    removed,
  };
}

function removeTrailingPrompt(lines: string[]): { lines: string[]; removed: number } {
  let end = lines.length;
  let removed = 0;

  while (end > 0 && !lines[end - 1]?.trim()) {
    end--;
    removed++;
  }

  while (end > 0) {
    const line = String(lines[end - 1] ?? "").trim();

    if (
      /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line) ||
      /^[A-Z]:\\>$/.test(line)
    ) {
      end--;
      removed++;
      continue;
    }

    break;
  }

  return {
    lines: lines.slice(0, end),
    removed,
  };
}

function removeSyslogs(lines: string[]): { lines: string[]; removed: number } {
  let removed = 0;

  const kept = lines.filter((line) => {
    if (IOS_SYSLOG_PATTERN.test(line.trim())) {
      removed++;
      return false;
    }

    return true;
  });

  return { lines: kept, removed };
}

export function cleanCmdOutput(options: CleanCmdOutputOptions): CleanCmdOutputResult {
  const rawOutput = normalizeLineEndings(stripAnsi(options.output));
  const warnings: string[] = [];

  if (options.deviceKind !== "ios") {
    return {
      output: rawOutput.trim(),
      rawOutput,
      warnings,
      removedLineCount: 0,
    };
  }

  let removedLineCount = 0;
  let lines = rawOutput.split("\n");

  const withoutEcho = removeLeadingCommandEcho(lines, options.command);
  lines = withoutEcho.lines;
  removedLineCount += withoutEcho.removed;

  if (!options.includeSyslogs) {
    const withoutSyslogs = removeSyslogs(lines);
    lines = withoutSyslogs.lines;
    removedLineCount += withoutSyslogs.removed;

    if (withoutSyslogs.removed > 0) {
      warnings.push(`Se filtraron ${withoutSyslogs.removed} líneas syslog IOS. Usa --raw o --logs para verlas.`);
    }
  }

  const withoutPrompt = removeTrailingPrompt(lines);
  lines = withoutPrompt.lines;
  removedLineCount += withoutPrompt.removed;

  if (withoutEcho.removed > 0) {
    warnings.push(`Se filtró el eco del comando (${withoutEcho.removed} línea/s).`);
  }

  return {
    output: lines.join("\n").trim(),
    rawOutput,
    warnings,
    removedLineCount,
  };
}
