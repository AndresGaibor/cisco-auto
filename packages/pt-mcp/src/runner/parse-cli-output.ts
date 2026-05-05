export interface ParsedCliOutput {
  json: unknown | null;
  stdout: string;
  stderr: string;
}

export function parseCliOutput(stdout: string, stderr: string, parseJson: boolean): ParsedCliOutput {
  if (!parseJson) {
    return { json: null, stdout, stderr };
  }

  const trimmed = stdout.trim();

  if (!trimmed) {
    return { json: null, stdout, stderr };
  }

  try {
    return { json: JSON.parse(trimmed), stdout, stderr };
  } catch {
    return { json: null, stdout, stderr };
  }
}
