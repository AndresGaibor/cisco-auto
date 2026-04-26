import { readFileSync } from "node:fs";

export interface ReadOmniCodeOptions {
  file?: string;
  stdin?: boolean;
  codeParts: string[];
  wrap?: boolean;
}

export function readOmniCode(options: ReadOmniCodeOptions): string {
  let code = "";

  if (options.file) {
    code = readFileSync(options.file, "utf-8");
  } else if (options.stdin) {
    code = readFileSync(0, "utf-8");
  } else {
    code = options.codeParts.join(" ").trim();
  }

  if (!code.trim()) {
    throw new Error(
      'Debes pasar código, --file o --stdin. Ejemplo: pt omni raw "n.getDeviceCount()" --yes',
    );
  }

  if (options.wrap) {
    return `(function() {\n${code}\n})()`;
  }

  return code;
}

export function tryParseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}
