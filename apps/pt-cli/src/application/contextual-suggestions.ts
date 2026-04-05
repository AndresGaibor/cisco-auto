import type { CliResult } from "../contracts/cli-result.js";

export function getContextualSuggestions(result: CliResult | null | undefined, options?: { saveRequested?: boolean }): string[] {
  const suggestions: string[] = [];
  if (!result) return suggestions;

  const v = (result as any).verification;

  // 8.1 Guardado pendiente (if caller indicates save was not requested)
  if (options?.saveRequested === false) {
    suggestions.push('No olvides guardar la configuración (ejecuta "write memory" o habilita --save).');
  }

  // 8.2 Verificación incompleta
  if (v && v.executed === true && v.verified === false && !v.partiallyVerified) {
    suggestions.push('El comando se ejecutó, pero la verificación no fue concluyente. Considera ejecutar el show apropiado.');
  }

  // 8.3 Verificación parcial
  if (v && v.partiallyVerified === true) {
    suggestions.push('Se verificó parcialmente; revisa las salidas de show correspondientes para completar la validación.');
  }

  // 8.4 Parser dudoso
  if (v && Array.isArray(v.warnings) && v.warnings.length > 0) {
    suggestions.push('La salida se parseó con advertencias; interpreta el resultado con cautela.');
  }

  return suggestions;
}
