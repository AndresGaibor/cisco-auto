import type { UseCase } from '../base/use-case.js';
import type { PersistencePort } from '../../ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../plugin-api/backend.plugin.js';
import type {
  ConfigureDeviceInput,
  ConfigureDeviceOutput,
  DeviceEntity,
  UseCaseResult,
} from '../types.js';

interface BackendPluginWithDeviceMethods extends BackendPlugin {
  configureDevice(name: string, commands: string[]): Promise<{ results?: Array<{ command: string; output: string; success: boolean }> }>;
}

/**
 * Use case para configurar un dispositivo IOS con comandos.
 *
 * Reciba una lista de comandos IOS y los ejecuta en el dispositivo
 * a través del backend. Valida que el dispositivo exista y que
 * al menos un comando esté presente.
 *
 * @param repository - Puerto de persistencia para verificar existencia del dispositivo
 * @param backend - Plugin de backend que ejecuta los comandos en PT
 */
export class ConfigureDeviceUseCase implements UseCase<ConfigureDeviceInput, UseCaseResult<ConfigureDeviceOutput>> {
  constructor(
    private readonly repository: PersistencePort<DeviceEntity>,
    private readonly backend: BackendPluginWithDeviceMethods,
  ) {}

  async execute(input: ConfigureDeviceInput): Promise<UseCaseResult<ConfigureDeviceOutput>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.commands || input.commands.length === 0) {
      return {
        success: false,
        errors: ['At least one command is required'],
        warnings,
      };
    }

    const existing = await this.repository.findById(input.deviceName);
    if (!existing) {
      return {
        success: false,
        errors: [`Device "${input.deviceName}" not found`],
        warnings,
      };
    }

    let backendResult: { results?: Array<{ command: string; output: string; success: boolean }> };
    try {
      backendResult = await this.backend.configureDevice(input.deviceName, input.commands);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to configure device: ${(error as Error).message}`],
        warnings,
      };
    }

    const results = backendResult.results ?? input.commands.map(cmd => ({
      command: cmd,
      output: '',
      success: true,
    }));

    return {
      success: true,
      data: {
        executed: results.length,
        results,
      },
      errors,
      warnings,
    };
  }
}
