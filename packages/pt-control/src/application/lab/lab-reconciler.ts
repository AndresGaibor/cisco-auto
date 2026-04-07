import type { TopologyService } from '../services/topology-service.js';
import type { TopologySnapshot, DeviceState, LinkState } from '../../contracts/index.js';
import type { LabDeviceSpec, LabLinkSpec } from '../../contracts/lab-spec.js';
import type { LabResourceType } from '../../contracts/lab-resource.js';

export interface ReconcileResult {
  action: 'created' | 'updated' | 'removed' | 'skipped' | 'failed';
  resourceType: LabResourceType;
  resourceId: string;
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * Contexto observable del estado actual de la topología.
 */
export interface ObservedTopology {
  snapshot: TopologySnapshot | null;
  devices: Map<string, DeviceState>;
}

/**
 * LabReconciler implementa reconciliación idempotente de topología.
 * 
 * Cada método verifica el estado actual ANTES de actuar, siguiendo el patrón:
 * 1. Verificar estado observado
 * 2. Comparar con estado deseado
 * 3. Actuar SOLO si hay drift
 * 4. Retornar resultado con acción tomada
 * 
 * Restricción crítica: NUNCA llama a clearTopology() - solo operaciones incrementales.
 */
export class LabReconciler {
  constructor(private readonly topologyService: TopologyService) {}

  /**
   * Asegura que un dispositivo exista con las propiedades especificadas.
   * 
   * Flujo:
   * - Si el dispositivo no existe → crear
   * - Si existe con modelo correcto → skip
   * - Si existe con modelo incorrecto → error (requiere remove + create manual)
   * 
   * @param spec - Especificación del dispositivo deseado
   * @param observed - Estado observado actual de la topología
   * @returns Resultado con acción tomada
   */
  async ensureDevice(spec: LabDeviceSpec, observed: ObservedTopology): Promise<ReconcileResult> {
    const deviceName = spec.name;
    const existingDevice = observed.devices.get(deviceName);

    // Caso 1: Dispositivo no existe → crear
    if (!existingDevice) {
      try {
        const modelToCreate = spec.ptModel ?? spec.model;
        await this.topologyService.addDevice(deviceName, modelToCreate, {
          x: spec.x,
          y: spec.y,
        });

        return {
          action: 'created',
          resourceType: 'device',
          resourceId: deviceName,
          details: { model: modelToCreate, x: spec.x, y: spec.y },
        };
      } catch (error) {
        return {
          action: 'failed',
          resourceType: 'device',
          resourceId: deviceName,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Caso 2: Dispositivo existe con modelo incorrecto → error (requiere operación compuesta)
    const expectedModel = spec.ptModel ?? spec.model;
    if (existingDevice.model !== expectedModel) {
      return {
        action: 'failed',
        resourceType: 'device',
        resourceId: deviceName,
        error: `Modelo incorrecto: esperado '${expectedModel}', observado '${existingDevice.model}'. Requiere remove + create.`,
        details: { expectedModel, observedModel: existingDevice.model },
      };
    }

    // Caso 3: Dispositivo existe con modelo correcto → skip
    return {
      action: 'skipped',
      resourceType: 'device',
      resourceId: deviceName,
      details: { reason: 'Dispositivo ya existe con modelo correcto' },
    };
  }

  /**
   * Asegura que un dispositivo esté en la posición correcta del canvas.
   * 
   * Flujo:
   * - Si posición coincide → skip
   * - Si posición difiere → mover
   * - Si dispositivo no existe → error
   * 
   * @param deviceName - Nombre del dispositivo
   * @param x - Posición X deseada
   * @param y - Posición Y deseada
   * @param observed - Estado observado actual
   * @returns Resultado con acción tomada
   */
  async ensureDevicePosition(
    deviceName: string,
    x: number,
    y: number,
    observed: ObservedTopology
  ): Promise<ReconcileResult> {
    const existingDevice = observed.devices.get(deviceName);

    // Caso 1: Dispositivo no existe → error
    if (!existingDevice) {
      return {
        action: 'failed',
        resourceType: 'device',
        resourceId: deviceName,
        error: 'Dispositivo no existe. Debe ser creado primero.',
      };
    }

    // Caso 2: Posición coincide → skip
    if (existingDevice.x === x && existingDevice.y === y) {
      return {
        action: 'skipped',
        resourceType: 'device',
        resourceId: deviceName,
        details: { reason: 'Posición ya es correcta', x, y },
      };
    }

    // Caso 3: Posición difiere → mover
    try {
      const result = await this.topologyService.moveDevice(deviceName, x, y);

      if (!result.ok) {
        return {
          action: 'failed',
          resourceType: 'device',
          resourceId: deviceName,
          error: result.error,
        };
      }

      return {
        action: 'updated',
        resourceType: 'device',
        resourceId: deviceName,
        details: { previousX: existingDevice.x, previousY: existingDevice.y, newX: x, newY: y },
      };
    } catch (error) {
      return {
        action: 'failed',
        resourceType: 'device',
        resourceId: deviceName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Asegura que un enlace exista entre dos dispositivos.
   * 
   * Flujo:
   * - Si enlace existe entre los puertos especificados → skip
   * - Si enlace no existe → crear
   * - Si uno de los dispositivos no existe → error
   * 
   * @param spec - Especificación del enlace deseado
   * @param observed - Estado observado actual
   * @returns Resultado con acción tomada
   */
  async ensureLink(spec: LabLinkSpec, observed: ObservedTopology): Promise<ReconcileResult> {
    const linkId = `${spec.fromDevice}:${spec.fromPort}<->${spec.toDevice}:${spec.toPort}`;

    // Verificar que ambos dispositivos existan
    const device1Exists = observed.devices.has(spec.fromDevice);
    const device2Exists = observed.devices.has(spec.toDevice);

    if (!device1Exists || !device2Exists) {
      const missing = [];
      if (!device1Exists) missing.push(spec.fromDevice);
      if (!device2Exists) missing.push(spec.toDevice);

      return {
        action: 'failed',
        resourceType: 'link',
        resourceId: linkId,
        error: `Dispositivos no existen: ${missing.join(', ')}. Deben ser creados primero.`,
      };
    }

    // Verificar si enlace ya existe
    const snapshot = observed.snapshot;
    if (snapshot) {
      const linkExists = Object.values(snapshot.links).some((link: LinkState) => {
        // Enlace coincide en ambas direcciones
        const forward =
          link.device1 === spec.fromDevice &&
          link.port1 === spec.fromPort &&
          link.device2 === spec.toDevice &&
          link.port2 === spec.toPort;

        const backward =
          link.device1 === spec.toDevice &&
          link.port1 === spec.toPort &&
          link.device2 === spec.fromDevice &&
          link.port2 === spec.fromPort;

        return forward || backward;
      });

      if (linkExists) {
        return {
          action: 'skipped',
          resourceType: 'link',
          resourceId: linkId,
          details: { reason: 'Enlace ya existe' },
        };
      }
    }

    // Enlace no existe → crear
    try {
      // Mapear cableType del spec al linkType de TopologyService
      const linkTypeMap: Record<string, string> = {
        straight: 'straight',
        crossover: 'cross',
        rollover: 'roll',
        fiber: 'fiber',
        serial: 'serial',
      };
      const linkType = linkTypeMap[spec.cableType ?? 'straight'] ?? 'straight';

      await this.topologyService.addLink(
        spec.fromDevice,
        spec.fromPort,
        spec.toDevice,
        spec.toPort,
        linkType as any
      );

      return {
        action: 'created',
        resourceType: 'link',
        resourceId: linkId,
        details: {
          fromDevice: spec.fromDevice,
          fromPort: spec.fromPort,
          toDevice: spec.toDevice,
          toPort: spec.toPort,
          cableType: spec.cableType ?? 'straight',
        },
      };
    } catch (error) {
      return {
        action: 'failed',
        resourceType: 'link',
        resourceId: linkId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Remueve un dispositivo extra (no especificado en el lab).
   * 
   * @param deviceName - Nombre del dispositivo a remover
   * @returns Resultado con acción tomada
   */
  async removeExtraDevice(deviceName: string): Promise<ReconcileResult> {
    try {
      await this.topologyService.removeDevice(deviceName);

      return {
        action: 'removed',
        resourceType: 'device',
        resourceId: deviceName,
      };
    } catch (error) {
      return {
        action: 'failed',
        resourceType: 'device',
        resourceId: deviceName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Remueve un enlace extra (no especificado en el lab).
   * 
   * @param device - Dispositivo del enlace
   * @param port - Puerto del enlace
   * @returns Resultado con acción tomada
   */
  async removeExtraLink(device: string, port: string): Promise<ReconcileResult> {
    const linkId = `${device}:${port}`;

    try {
      await this.topologyService.removeLink(device, port);

      return {
        action: 'removed',
        resourceType: 'link',
        resourceId: linkId,
      };
    } catch (error) {
      return {
        action: 'failed',
        resourceType: 'link',
        resourceId: linkId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Construye el contexto observado desde el TopologyService.
   * 
   * @returns Snapshot y mapa de dispositivos
   */
  async getObservedTopology(): Promise<ObservedTopology> {
    const snapshot = await this.topologyService.snapshot();
    const devices = new Map<string, DeviceState>();

    if (snapshot) {
      for (const [name, device] of Object.entries(snapshot.devices)) {
        devices.set(name, device);
      }
    }

    return { snapshot, devices };
  }
}
