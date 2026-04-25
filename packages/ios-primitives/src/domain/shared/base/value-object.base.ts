/**
 * Clase base para todos los Value Objects del dominio.
 * 
 * Un Value Object es un objeto sin identidad, definido únicamente por sus atributos.
 * Dos Value Objects son iguales si todos sus atributos son iguales.
 * 
 * @template T - El tipo del valor encapsulado
 */
export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = Object.freeze(value) as T;
  }

  /**
   * Obtiene el valor encapsulado.
   */
  get value(): T {
    return this._value;
  }

  /**
   * Compara dos Value Objects por igualdad de valor.
   * Dos VOs son iguales si tienen el mismo tipo y valor.
   */
  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this.constructor !== other.constructor) {
      return false;
    }
    return this.deepEqual(this._value, other._value);
  }

  /**
   * Comparación profunda de valores.
   * Maneja objetos anidados y arrays.
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object' || a === null || b === null) return false;
    
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    
    const keysA = Object.keys(aObj);
    const keysB = Object.keys(bObj);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => this.deepEqual(aObj[key], bObj[key]));
  }

  /**
   * Serializa el Value Object a su representación JSON.
   * Delega a toJSON del valor interno si existe.
   */
  toJSON(): unknown {
    if (this._value === null || this._value === undefined) {
      return this._value;
    }
    
    // Si el valor ya tiene un método toJSON, usarlo
    if (typeof this._value === 'object' && 'toJSON' in this._value && typeof (this._value as { toJSON: () => unknown }).toJSON === 'function') {
      return (this._value as { toJSON: () => unknown }).toJSON();
    }
    
    return this._value;
  }

  /**
   * Representación string del Value Object.
   */
  toString(): string {
    return String(this._value);
  }
}