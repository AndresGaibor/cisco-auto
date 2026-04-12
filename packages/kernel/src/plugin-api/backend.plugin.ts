import type { BackendPort } from '../application/ports/driven/backend.port.js';
import type { PluginValidationResult } from './plugin.types.js';

export interface BackendPlugin extends BackendPort {
  category: 'backend';
  name: string;
  version: string;
  validate(config: unknown): PluginValidationResult;
}
