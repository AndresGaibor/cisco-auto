// ============================================================================
// Terminal Utils - Funciones utilitarias para el motor de terminal
// ============================================================================
// Proporciona funciones utilitarias pequeñas usadas por el command executor.
// Estas funciones son puras y testeables sin necesidad de mocks de PT API.

/**
 * Detecta si el output contiene el wizard de configuración inicial de IOS.
 * El wizard aparece cuando el router tiene configuración en blanco.
 */
export function detectWizardFromOutput(output: string): boolean {
  return (
    output.includes("initial configuration dialog?") ||
    output.includes("[yes/no]") ||
    output.includes("continuar con la configuración")
  );
}

/**
 * Promise-based sleep.
 * Útil para delays asíncronos en el state machine.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifica si el terminal tiene paging activo (--More--).
 * Lee el buffer/output del terminal de forma segura.
 */
export function terminalOutputHasPager(terminal: { getOutput?(): string; getAllOutput?(): string; getBuffer?(): string }): boolean {
  try {
    const out1 = terminal.getOutput?.();
    const out2 = terminal.getAllOutput?.();
    const out3 = terminal.getBuffer?.();

    const output = (out1 != null && out1.length > 0)
      ? out1
      : (out2 != null && out2.length > 0)
        ? out2
        : (out3 != null && out3.length > 0)
          ? out3
          : "";

    return /--More--/i.test(String(output));
  } catch {
    return false;
  }
}
