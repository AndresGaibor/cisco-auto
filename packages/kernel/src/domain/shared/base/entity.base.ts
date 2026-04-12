import { ValueObject } from './value-object.base.js';

/**
 * Clase base para todas las entidades del dominio.
 *
 * Una entidad tiene identidad propia que la distingue de otras,
 * incluso si todos sus atributos son iguales.
 *
 * @template TId - Tipo del identificador (debe extender ValueObject)
 */
export abstract class Entity<TId extends ValueObject<unknown>> {
  protected readonly _id: TId;

  constructor(id: TId) {
    this._id = id;
  }

  /**
   * Obtiene el identificador de la entidad
   */
  get id(): TId {
    return this._id;
  }

  /**
   * Compara dos entidades por identidad
   */
  equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this.constructor !== other.constructor) {
      return false;
    }
    return this._id.equals(other._id as TId);
  }
}
