import { parseCommandFileName } from "./path-layout.js";

export function isQueueIndexFile(name: string): boolean {
  return name === "_queue.json";
}

export function isFsSidecarFile(name: string): boolean {
  return (
    name.startsWith(".") ||
    name.endsWith(".tmp") ||
    name.includes(".tmp.") ||
    name.endsWith(".meta.json") ||
    name.endsWith(".error.json")
  );
}

export function isLegacyCommandFile(name: string): boolean {
  return /^cmd_\d+\.json$/.test(name);
}

export function isBridgeCommandFile(name: string): boolean {
  if (isQueueIndexFile(name) || isFsSidecarFile(name)) return false;
  return parseCommandFileName(name) !== null || isLegacyCommandFile(name);
}

export function isBridgeResultFile(name: string): boolean {
  if (isQueueIndexFile(name) || isFsSidecarFile(name)) return false;
  return /^cmd_\d+\.json$/.test(name);
}

export function isDeadLetterCommandFile(name: string): boolean {
  if (isQueueIndexFile(name) || isFsSidecarFile(name)) return false;
  return name.endsWith(".json");
}

export function filterBridgeCommandFiles(names: string[]): string[] {
  return names.filter(isBridgeCommandFile).sort();
}

export function filterBridgeResultFiles(names: string[]): string[] {
  return names.filter(isBridgeResultFile).sort();
}

export function filterDeadLetterCommandFiles(names: string[]): string[] {
  return names.filter(isDeadLetterCommandFile).sort();
}