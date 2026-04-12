import type { PluginCategory, PluginCommandDefinition, PluginValidationResult } from './plugin.types.js';

export interface ProtocolPlugin {
  id: string;
  category: Extract<PluginCategory, 'switching' | 'routing' | 'security' | 'services'>;
  name: string;
  version: string;
  description: string;
  commands: PluginCommandDefinition[];
  validate(config: unknown): PluginValidationResult;
}
