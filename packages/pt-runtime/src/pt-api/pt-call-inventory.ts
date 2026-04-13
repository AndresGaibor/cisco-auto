export interface PTCallEntry {
  objectType: string;
  method: string;
  sourceFile: string;
  lines: number[];
  defensive: boolean;
}

export const PT_CALL_INVENTORY: PTCallEntry[] = [];

export function getCallsForFile(sourceFile: string): PTCallEntry[] {
  return PT_CALL_INVENTORY.filter((entry) => entry.sourceFile === sourceFile);
}

export function getMethodsForObjectType(objectType: string): string[] {
  const methods = new Set<string>();
  for (const entry of PT_CALL_INVENTORY) {
    if (entry.objectType === objectType) {
      methods.add(entry.method);
    }
  }
  return Array.from(methods).sort();
}
