/**
 * Clase base para todos los Aggregate Roots del dominio.
 *
 * Un Aggregate Root es la puerta de entrada a un grupo de entidades
 * relacionadas. Es responsable de:
 * - Mantener la consistencia de las invariantes del aggregate
 * - Recopilar eventos de dominio generados por cambios
 * - Ser la única entidad accesible desde fuera del aggregate
 *
 * @template TId - Tipo del identificador (debe extender ValueObject)
 */
import { ValueObject } from './value-object.base.js';
import { Entity } from './entity.base.js';
import type { DomainEvent } from '../events/domain-event.interface.js';

export abstract class Aggregate<TId extends ValueObject<unknown>> extends Entity<TId> {
  private readonly _events: DomainEvent[] = [];

  /**
   * Obtiene los eventos de dominio pendientes de publicar
   */
  get events(): readonly DomainEvent[] {
    return [...this._events];
  }

  /**
   * Registra un evento de dominio en el aggregate
   */
  protected recordEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  /**
   * Limpia los eventos de dominio después de ser publicados
   */
  clearEvents(): void {
    this._events.length = 0;
  }

  /**
   * Valida las invariantes del aggregate.
   * Lanza DomainError si alguna invariante se viola.
   */
  abstract validate(): void;
}
