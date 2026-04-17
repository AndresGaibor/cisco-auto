// ============================================================================
// Helper Functions for Module Operations
// ============================================================================

export function safeString(v: unknown): string {
  if (v === null || v === undefined) return "";
  try {
    return String(v);
  } catch {
    return "";
  }
}

export function isHWICOrWIC(moduleId: string): boolean {
  const id = safeString(moduleId).toUpperCase();
  return id.startsWith("HWIC-") || id.startsWith("WIC-");
}

export function isNetworkModule(moduleId: string): boolean {
  const id = safeString(moduleId).toUpperCase();
  return id.startsWith("NM-");
}
