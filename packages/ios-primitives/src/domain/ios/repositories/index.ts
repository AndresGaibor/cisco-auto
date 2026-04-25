import type { DeviceAggregate } from '../aggregates/device.aggregate.js';
import type { DeviceType } from '../../value-objects/device-id.vo.js';

/**
 * Interfaz de repositorio para dispositivos IOS.
 * Define las operaciones de persistencia para DeviceAggregate.
 */
export interface DeviceRepository {
  /** Busca un dispositivo por su ID */
  findById(id: string): Promise<DeviceAggregate | null>;
  /** Guarda un dispositivo (create o update) */
  save(device: DeviceAggregate): Promise<void>;
  /** Elimina un dispositivo por su ID */
  delete(id: string): Promise<boolean>;
  /** Busca todos los dispositivos */
  findAll(): Promise<DeviceAggregate[]>;
  /** Busca dispositivos por tipo */
  findByType(type: DeviceType): Promise<DeviceAggregate[]>;
}

/**
 * Interfaz de repositorio para topología de red.
 * Define las operaciones de persistencia para TopologyGraphAggregate.
 */
export interface TopologyRepository {
  /** Guarda una topología */
  save(topology: import('../topology/aggregates/topology-graph.aggregate.js').TopologyGraphAggregate): Promise<void>;
  /** Busca una topología por ID */
  findById(id: string): Promise<import('../topology/aggregates/topology-graph.aggregate.js').TopologyGraphAggregate | null>;
  /** Busca todas las topologías */
  findAll(): Promise<import('../topology/aggregates/topology-graph.aggregate.js').TopologyGraphAggregate[]>;
}
