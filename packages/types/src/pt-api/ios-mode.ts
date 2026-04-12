// packages/types/src/pt-api/ios-mode.ts
// Tipo unificado para modos de sesión IOS
// Un único source of truth para todos los packages

/**
 * Modos de sesión IOS reconocidos por el sistema
 * Usado por pt-runtime, pt-control, y cualquier package que interactúe con IOS CLI
 */
export type IosMode =
  | "user-exec"           // Router>
  | "privileged-exec"     // Router#
  | "config"              // Router(config)#
  | "config-if"           // Router(config-if)#
  | "config-line"         // Router(config-line)#
  | "config-router"       // Router(config-router)#
  | "config-vlan"         // Router(config-vlan)#
  | "config-subif"        // Router(config-subif)#
  | "rommon"              // rommon 1 >
  | "paging"              // --More--
  | "awaiting-confirm"    // Confirmación pendiente
  | "awaiting-password"   // Password prompt
  | "unknown";            // No reconocido

/**
 * Jerarquía de modos (menor = menos privilegiado)
 */
export const IOS_MODE_HIERARCHY: Record<IosMode, number> = {
  "unknown": 0,
  "rommon": 1,
  "user-exec": 2,
  "privileged-exec": 3,
  "config": 4,
  "config-if": 5,
  "config-line": 5,
  "config-router": 5,
  "config-vlan": 5,
  "config-subif": 5,
  "paging": 6,
  "awaiting-confirm": 6,
  "awaiting-password": 6,
};

/**
 * Verifica si un modo es un modo exec (user o privileged)
 */
export function isIosExecMode(mode: IosMode): boolean {
  return mode === "user-exec" || mode === "privileged-exec";
}

/**
 * Verifica si un modo es un modo config (cualquier submodo de configuración)
 */
export function isIosConfigMode(mode: IosMode): boolean {
  return mode.startsWith("config");
}

/**
 * Verifica si un modo es privilegiado
 */
export function isIosPrivileged(mode: IosMode): boolean {
  return mode === "privileged-exec" || mode === "config";
}

/**
 * Convierte el nombre legacy 'priv-exec' al nombre estándar
 */
export function normalizeIosMode(mode: string): IosMode {
  if (mode === "priv-exec") return "privileged-exec";
  return mode as IosMode;
}
