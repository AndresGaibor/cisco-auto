import type { PluginValidationResult } from './plugin.types.js';

export interface DevicePlugin {
  category: 'device';
  name: string;
  version: string;
  supportedModels: string[];
  validate(device: unknown): PluginValidationResult;
}
