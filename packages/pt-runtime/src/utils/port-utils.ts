/** Normalize a port name for comparison across interface families. */
export function normalizePortKey(name: string): string {
  const value = String(name || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const suffix = value.match(/(\d+(?:\/\d+)*(?:\.\d+)?)$/);
  return suffix ? suffix[1] : value;
}

/** Normaliza nombres de interfaz para comparación flexible
 * Ej: "FastEthernet0/1" === "fa0/1", "GigabitEthernet1/0/1" === "gi1/0/1"
 */
export function normalizeIfaceName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/gigabitethernet/g, "gi")
    .replace(/fastethernet/g, "fa")
    .replace(/ethernet/g, "eth");
}

/** Normalize a MAC address for comparison (remove delimiters, lowercase) */
export function normalizeMac(mac: any): string {
  if (!mac) return "";
  return String(mac).toLowerCase().replace(/[:.-]/g, "");
}
