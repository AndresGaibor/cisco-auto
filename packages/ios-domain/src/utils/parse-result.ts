// ============================================================================
// IOS Parser Result Framework
// Proporciona tipo de retorno consistente para todos los parsers IOS
// ============================================================================

/**
 * Indica si el output vino del terminal real, fue generado sintéticamente,
 * o es una combinación (e.g., output interpolado con datos synth).
 */
export type OutputSource = "terminal" | "synthetic" | "hybrid";

/**
 * Resultado de parsing con metadatos de calidad y fuente.
 * Todos los parsers IOS retornan este tipo para permitir manejo uniforme.
 */
export interface ParseResult<T> {
  /** Datos parseados del output IOS */
  parsed: T;
  /** Output (sanitizado) sin parsear para debug */
  raw: string;
  /** Warnings de parsing parcial (e.g., líneas no reconocidas) */
  warnings: string[];
  /** Score de confianza 0-1 (1 = plena confianza) */
  confidence: number;
  /** Fuente del output */
  source: OutputSource;
}

/**
 * Crea un resultado de parsing exitoso con confianza plena.
 * Útil para parsers que pueden parsear todo el input.
 * @param parsed - Datos ya parseados
 * @param raw - Output original (sanitizado)
 * @param options - Configuración opcional: source, warnings, confidence
 * @returns ParseResult con confidence 1.0 y source default "terminal"
 */
export function createParseResult<T>(
  parsed: T,
  raw: string,
  options?: {
    source?: OutputSource;
    warnings?: string[];
    confidence?: number;
  }
): ParseResult<T> {
  return {
    parsed,
    raw,
    warnings: options?.warnings ?? [],
    confidence: options?.confidence ?? 1.0,
    source: options?.source ?? "terminal",
  };
}

/**
 * Crea un resultado de parsing parcial con warnings.
 * Se usa cuando se puede parsear la mayoría del output pero algunas líneas no se reconocieron.
 * @param parsed - Datos parcialmente parseados
 * @param raw - Output original (sanitizado)
 * @param warnings - Lista de advertencias de parsing
 * @param source - Fuente del output (default: terminal)
 * @returns ParseResult con confidence 0.7 si hay warnings, 1.0 si no
 */
export function createPartialParseResult<T>(
  parsed: T,
  raw: string,
  warnings: string[],
  source: OutputSource = "terminal"
): ParseResult<T> {
  return {
    parsed,
    raw,
    warnings,
    confidence: warnings.length > 0 ? 0.7 : 1.0,
    source,
  };
}

/**
 * Crea un resultado de parsing fallido con datos parciales.
 * Se usa cuando el parsing falla pero se recuperó algo de información útil.
 * @param raw - Output original (sin sanitizar)
 * @param error - Mensaje de error describiendo qué falló
 * @param partialData - Datos parseados parcialmente (opcional)
 * @returns ParseResult con confidence 0 y warnings conteniendo el error
 */
export function createParseErrorResult<T>(
  raw: string,
  error: string,
  partialData?: Partial<T>
): ParseResult<T> {
  return {
    parsed: partialData as T,
    raw,
    warnings: [error],
    confidence: 0,
    source: "terminal",
  };
}
