/**
 * Tipo resultado para operaciones que pueden fallar.
 * Usa el patrón Either: Ok<T> o Err<E>.
 * 
 * @template T - Tipo del valor en caso de éxito
 * @template E - Tipo del error en caso de fallo (default: Error)
 */
export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

/**
 * Caso de éxito en un Result.
 * Contiene el valor calculado.
 */
interface Ok<T, _E> {
  readonly ok: true;
  readonly value: T;
  readonly error: undefined;
}

/**
 * Caso de error en un Result.
 * Contiene el error que ocurrió.
 */
interface Err<_T, E> {
  readonly ok: false;
  readonly value: undefined;
  readonly error: E;
}

/**
 * Crea un resultado exitoso.
 * 
 * @param value - Valor a envolver en el resultado
 * @returns Result con ok=true y el valor
 * 
 * @example
 * const result = ok(42); // { ok: true, value: 42, error: undefined }
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value, error: undefined };
}

/**
 * Crea un resultado con error.
 * 
 * @param error - Error que ocurrió
 * @returns Result con ok=false y el error
 * 
 * @example
 * const result = err(new Error('Something failed')); // { ok: false, value: undefined, error: ... }
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, value: undefined, error };
}

/**
 * Type guard para verificar si un resultado es exitoso.
 * 
 * @param result - Resultado a verificar
 * @returns True si el resultado es Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T, E> {
  return result.ok;
}

/**
 * Type guard para verificar si un resultado es error.
 * 
 * @param result - Resultado a verificar
 * @returns True si el resultado es Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<T, E> {
  return !result.ok;
}

/**
 * Ejecuta una función que puede lanzar y captura el resultado.
 * Si la función lanza, captura el error y lo envuelve en un Result.
 * 
 * @param fn - Función a ejecutar
 * @param errorFactory - Factory opcional para transformar el error
 * @returns Result con el valor o el error capturado
 * 
 * @example
 * const result = tryCatch(() => JSON.parse(input));
 * if (isErr(result)) console.error(result.error);
 */
export function tryCatch<T, E = Error>(fn: () => T, errorFactory?: (e: unknown) => E): Result<T, E> {
  try {
    return ok(fn());
  } catch (e) {
    return err(errorFactory ? errorFactory(e) : e as E);
  }
}
