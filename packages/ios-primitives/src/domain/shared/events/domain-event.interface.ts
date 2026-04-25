/**
 * Interfaz base para todos los eventos de dominio.
 *
 * Los eventos de dominio representan algo significativo que ocurrió
 * en el sistema. Son inmutables y contienen metadata de ocurrencia.
 * 
 * @template T - Tipo específico del evento que extiende DomainEvent
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
 * El tipo y occurredOn se generan automáticamente.
 * 
 * @param type - Nombre del tipo de evento
 * @param aggregateId - ID del aggregate que generó el evento
 * @param additional - Datos específicos del evento (excluye type, occurredOn, aggregateId)
 * @returns Evento tipado y completamente construido
 * 
 * @example
 * const event = createDomainEvent<DeviceAddedEvent>('DeviceAdded', deviceId.value, {
 *   deviceName: 'Router1',
 *   deviceType: 'router',
 *   model: '1941'
 * });
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
