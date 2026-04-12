import type { UseCase } from '../../base/use-case.js';
import type { PersistencePort } from '../../../ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../../plugin-api/backend.plugin.js';
import type { PluginRegistry } from '../../../../plugin-api/registry.js';
import type {
  ApplyVlanInput,
  ApplyVlanOutput,
  DeviceEntity,
  VlanEntry,
  UseCaseResult,
} from '../types.js';

interface BackendPluginWithDeviceMethods extends BackendPlugin {
  configureDevice(name: string, commands: string[]): Promise<{ results?: Array<{ command: string; output: string; success: boolean }> }>;
}

export class ApplyVlanUseCase implements UseCase<ApplyVlanInput, UseCaseResult<ApplyVlanOutput>> {
  constructor(
    private readonly repository: PersistencePort<DeviceEntity>,
    private readonly backend: BackendPluginWithDeviceMethods,
    private readonly registry: PluginRegistry,
  ) {}

  async execute(input: ApplyVlanInput): Promise<UseCaseResult<ApplyVlanOutput>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.vlanIds || input.vlanIds.length === 0) {
      return {
        success: false,
        errors: ['At least one VLAN ID is required'],
        warnings,
      };
    }

    const existing = await this.repository.findById(input.switchName);
    if (!existing) {
      return {
        success: false,
        errors: [`Switch "${input.switchName}" not found`],
        warnings,
      };
    }

    const vlanPlugin = this.registry.get('protocol', 'vlan');
    if (!vlanPlugin) {
      return {
        success: false,
        errors: ['VLAN protocol plugin not registered'],
        warnings,
      };
    }

    const vlanSpec = {
      switchName: input.switchName,
      vlans: input.vlanIds.map(id => ({
        id,
        name: input.vlanNames?.[id],
      })),
    };

    const validation = vlanPlugin.validate(vlanSpec);
    if (!validation.ok) {
      return {
        success: false,
        errors: validation.errors.map(e => `${e.path}: ${e.message}`),
        warnings,
      };
    }

    const commands: string[] = [];
    for (const vlan of vlanSpec.vlans) {
      commands.push(`vlan ${vlan.id}`);
      if (vlan.name) {
        commands.push(`name ${vlan.name}`);
      }
      commands.push('exit');
    }

    try {
      await this.backend.configureDevice(input.switchName, commands);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to apply VLANs: ${(error as Error).message}`],
        warnings,
      };
    }

    const vlans: VlanEntry[] = input.vlanIds.map(id => ({
      id,
      name: input.vlanNames?.[id],
    }));

    return { success: true, data: { vlans }, errors, warnings };
  }
}
