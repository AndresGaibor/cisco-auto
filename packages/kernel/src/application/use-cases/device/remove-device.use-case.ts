import type { UseCase } from '../base/use-case.js';
import type { PersistencePort } from '../../ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../plugin-api/backend.plugin.js';
import type {
  RemoveDeviceInput,
  RemoveDeviceOutput,
  DeviceEntity,
  UseCaseResult,
} from '../types.js';

interface BackendPluginWithDeviceMethods extends BackendPlugin {
  removeDevice(name: string): Promise<void>;
}

export class RemoveDeviceUseCase implements UseCase<RemoveDeviceInput, UseCaseResult<RemoveDeviceOutput>> {
  constructor(
    private readonly repository: PersistencePort<DeviceEntity>,
    private readonly backend: BackendPluginWithDeviceMethods,
  ) {}

  async execute(input: RemoveDeviceInput): Promise<UseCaseResult<RemoveDeviceOutput>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const existing = await this.repository.findById(input.name);
    if (!existing) {
      return {
        success: false,
        errors: [`Device "${input.name}" not found`],
        warnings,
      };
    }

    try {
      await this.backend.removeDevice(input.name);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to remove device from backend: ${(error as Error).message}`],
        warnings,
      };
    }

    await this.repository.delete(input.name);

    return { success: true, data: { removed: true }, errors, warnings };
  }
}
