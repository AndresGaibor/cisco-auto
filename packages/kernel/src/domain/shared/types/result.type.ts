/**
 * Tipo resultado para operaciones que pueden fallar.
 * Usa el patrón Either: Ok<T> o Err<E>.
 */
export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

interface Ok<T, E> {
  readonly ok: true;
  readonly value: T;
  readonly error: undefined;
}

interface Err<T, E> {
  readonly ok: false;
  readonly value: undefined;
  readonly error: E;
}

/**
 * Crea un resultado exitoso
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value, error: undefined };
}

/**
 * Crea un resultado con error
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, value: undefined, error };
}

/**
 * Verifica si un resultado es exitoso
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T, E> {
  return result.ok;
}

/**
 * Verifica si un resultado es un error
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<T, E> {
  return !result.ok;
}

/**
 * Ejecuta una función que puede lanzar y captura el resultado
 */
export function tryCatch<T, E = Error>(fn: () => T, errorFactory?: (e: unknown) => E): Result<T, E> {
  try {
    return ok(fn());
  } catch (e) {
    return err(errorFactory ? errorFactory(e) : e as E);
  }
}
