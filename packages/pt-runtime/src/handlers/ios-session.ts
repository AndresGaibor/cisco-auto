/**
 * iOS Session Management - Session state tracking and CLI mode inference
 * Handles prompt parsing, mode detection, and session state updates
 */

/**
 * Estado de sesión observado por el runtime de IOS.
 */
export interface RuntimeSessionState {
  mode: string;
  paging: boolean;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  awaitingDnsLookup: boolean;
}

/**
 * Infiere el modo IOS desde el prompt del terminal.
 * Analiza el sufijo del prompt para determinar el modo actual.
 * 
 * @param prompt - Prompt completo del terminal (ej: "Router#", "Router(config-if)#")
 * @returns Modo inferido: "user-exec", "privileged-exec", "config", "config-if", etc.
 * 
 * @example
 * inferModeFromPrompt("Router#") // → "privileged-exec"
 * inferModeFromPrompt("Router(config)#") // → "config"
 * inferModeFromPrompt("Router>") // → "user-exec"
 */
export function inferModeFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.endsWith("(config)#")) return "config";
  if (trimmed.endsWith("(config-if)#")) return "config-if";
  if (trimmed.endsWith("(config-line)#")) return "config-line";
  if (trimmed.endsWith("(config-router)#")) return "config-router";
  if (trimmed.endsWith("(config-subif)#")) return "config-subif";
  if (trimmed.endsWith("(config-vlan)#")) return "config-vlan";
  if (trimmed.endsWith("#")) return "privileged-exec";
  if (trimmed.endsWith(">")) return "user-exec";
  return "unknown";
}

/**
 * Actualiza el estado de sesión desde el output del terminal.
 * Detecta paging (--More--), confirm prompts, passwords, y DNS lookups.
 * También actualiza el modo desde la última línea válida del output.
 * 
 * @param session - Estado actual de la sesión (se modifica in-place)
 * @param output - Output completo del terminal desde el último comando
 */
export function updateSessionFromOutput(session: RuntimeSessionState, output: string): void {
  session.paging = output.includes("--More--");
  session.awaitingConfirm = /\n\[confirm\]/i.test(output) || output.startsWith("[confirm]");
  session.awaitingPassword = /^Password:/im.test(output);
  session.awaitingDnsLookup = /translating\s+["']?.+["']?\.\.\./i.test(output);

  const lines = output.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim();
    if (line && !line.includes("--More--") && !line.startsWith("%")) {
      const inferred = inferModeFromPrompt(line);
      if (inferred !== "unknown") {
        session.mode = inferred;
        break;
      }
    }
  }
}

/**
 * Verifica si el modo actual es modo configuración.
 * Incluye config, config-if, config-line, config-router, config-vlan, config-subif.
 * 
 * @param mode - Modo actual del terminal
 * @returns true si está en cualquier modo configuración
 */
export function isInConfigMode(mode: string): boolean {
  return mode.startsWith("config");
}

/**
 * Verifica si el modo actual es privilegiado o configuración.
 * Privileged exec incluye el modo config.
 * 
 * @param mode - Modo actual del terminal
 * @returns true si está en privileged exec o cualquier modo config
 */
export function isInPrivilegedMode(mode: string): boolean {
  return mode === "privileged-exec" || isInConfigMode(mode);
}
