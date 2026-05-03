import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, sep } from "node:path";

export function assertInsideDir(parentDir: string, childPath: string): void {
  const parent = resolve(parentDir);
  const child = resolve(childPath);

  if (child !== parent && !child.startsWith(parent + sep)) {
    throw new Error(`Ruta fuera del directorio permitido: ${childPath}`);
  }
}

export function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function readNdjsonFile<T extends Record<string, unknown> = Record<string, unknown>>(
  filePath: string,
): T[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(Boolean);
  const entries: T[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") {
        entries.push(parsed as T);
      }
    } catch {
      // Línea corrupta: se ignora.
    }
  }

  return entries;
}

export function countJsonFiles(dir: string): number {
  if (!existsSync(dir)) {
    return 0;
  }

  try {
    return readdirSync(dir).filter((file) => file.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

export function normalizeCommandId(commandId: string): string {
  return commandId.trim().replace(/\.json$/i, "").replace(/^cmd_/, "");
}

export function resolveNumberOrDefault(
  value: number | undefined,
  fallback: number,
  minimum = 1,
): number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum ? value : fallback;
}
