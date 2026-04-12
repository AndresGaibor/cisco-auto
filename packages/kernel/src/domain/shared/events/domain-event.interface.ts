/**
 * Interfaz base para todos los eventos de dominio.
 *
 * Los eventos de dominio representan algo significativo que ocurrió
 * en el sistema. Son inmutables y contienen metadata de ocurrencia.
 */
export interface DomainEvent {
  /** Tipo del evento (ej: 'DeviceAdded', 'InterfaceConfigured') */
  readonly type: string;
  /** Timestamp ISO cuando ocurrió el evento */
  readonly occurredOn: string;
  /** ID del aggregate root que generó el evento */
  readonly aggregateId: string;
}

/**
 * Crea un DomainEvent con los campos base completados.
 */
export function createDomainEvent<T extends DomainEvent>(
  type: string,
  aggregateId: string,
  additional: Omit<T, 'type' | 'occurredOn' | 'aggregateId'>
): T {
  return {
    type,
    occurredOn: new Date().toISOString(),
    aggregateId,
    ...additional,
  } as T;
}
