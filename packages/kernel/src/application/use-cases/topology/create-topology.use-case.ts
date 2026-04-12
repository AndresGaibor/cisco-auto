import type { UseCase } from '../../base/use-case.js';
import type { PersistencePort } from '../../../ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../../plugin-api/backend.plugin.js';
import type {
  CreateTopologyInput,
  CreateTopologyOutput,
  DeviceEntity,
  DeviceInput,
  LinkInput,
  TopologyGraph,
  TopologyNode,
  UseCaseResult,
} from '../types.js';

interface BackendPluginWithTopologyMethods extends BackendPlugin {
  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
  addLink(device1: string, port1: string, device2: string, port2: string): Promise<unknown>;
}

export class CreateTopologyUseCase implements UseCase<CreateTopologyInput, UseCaseResult<CreateTopologyOutput>> {
  constructor(
    private readonly repository: PersistencePort<DeviceEntity>,
    private readonly backend: BackendPluginWithTopologyMethods,
  ) {}

  async execute(input: CreateTopologyInput): Promise<UseCaseResult<CreateTopologyOutput>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.devices || input.devices.length === 0) {
      return {
        success: false,
        errors: ['At least one device is required'],
        warnings,
      };
    }

    for (const device of input.devices) {
      try {
        await this.backend.addDevice(device.name, device.model, {
          x: device.x,
          y: device.y,
        });
      } catch (error) {
        return {
          success: false,
          errors: [`Failed to add device "${device.name}": ${(error as Error).message}`],
          warnings,
        };
      }

      const entity: DeviceEntity = {
        id: device.name,
        name: device.name,
        model: device.model,
        type: device.type,
        x: device.x,
        y: device.y,
      };

      await this.repository.save(entity);
    }

    const deviceNames = new Set(input.devices.map(d => d.name));
    for (const link of input.links) {
      if (!deviceNames.has(link.device1)) {
        return {
          success: false,
          errors: [`Link references non-existent device "${link.device1}"`],
          warnings,
        };
      }
      if (!deviceNames.has(link.device2)) {
        return {
          success: false,
          errors: [`Link references non-existent device "${link.device2}"`],
          warnings,
        };
      }

      try {
        await this.backend.addLink(link.device1, link.port1, link.device2, link.port2);
      } catch (error) {
        return {
          success: false,
          errors: [`Failed to add link: ${(error as Error).message}`],
          warnings,
        };
      }
    }

    const nodes = new Map<string, TopologyNode>();
    for (const device of input.devices) {
      const entity: DeviceEntity = {
        id: device.name,
        name: device.name,
        model: device.model,
        type: device.type,
        x: device.x,
        y: device.y,
      };

      const deviceLinks = input.links
        .filter(l => l.device1 === device.name || l.device2 === device.name)
        .map(l => `${l.device1}:${l.port1}-${l.device2}:${l.port2}`);

      nodes.set(device.name, { device: entity, links: deviceLinks });
    }

    const edges = input.links.map(link => ({
      from: link.device1,
      to: link.device2,
      port1: link.port1,
      port2: link.port2,
    }));

    const topology: TopologyGraph = { nodes, edges };

    return { success: true, data: { topology }, errors, warnings };
  }
}
