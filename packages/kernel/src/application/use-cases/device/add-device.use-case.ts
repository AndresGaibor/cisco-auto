import type { UseCase } from '../base/use-case.js';
import type { PersistencePort } from '../../ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../plugin-api/backend.plugin.js';
import type {
  AddDeviceInput,
  AddDeviceOutput,
  DeviceEntity,
  UseCaseResult,
} from '../types.js';

interface BackendPluginWithDeviceMethods extends BackendPlugin {
  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
}

export class AddDeviceUseCase implements UseCase<AddDeviceInput, UseCaseResult<AddDeviceOutput>> {
  constructor(
    private readonly repository: PersistencePort<DeviceEntity>,
    private readonly backend: BackendPluginWithDeviceMethods,
  ) {}

  async execute(input: AddDeviceInput): Promise<UseCaseResult<AddDeviceOutput>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.name || input.name.trim() === '') {
      errors.push('Device name is required');
    }

    if (!input.model || input.model.trim() === '') {
      errors.push('Device model is required');
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    const existing = await this.repository.findById(input.name);
    if (existing) {
      return {
        success: false,
        errors: [`Device "${input.name}" already exists`],
        warnings,
      };
    }

    try {
      await this.backend.addDevice(input.name, input.model, {
        x: input.x,
        y: input.y,
      });
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to add device to backend: ${(error as Error).message}`],
        warnings,
      };
    }

    const device: DeviceEntity = {
      id: input.name,
      name: input.name,
      model: input.model,
      type: input.type,
      x: input.x,
      y: input.y,
    };

    await this.repository.save(device);

    return { success: true, data: { device }, errors, warnings };
  }
}
