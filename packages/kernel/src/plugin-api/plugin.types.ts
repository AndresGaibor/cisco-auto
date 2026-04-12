import type { ZodSchema } from 'zod';

export type PluginCategory = 'switching' | 'routing' | 'security' | 'services' | 'backend' | 'device';

export interface PluginCommandDefinition {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  examples: Array<{ input: Record<string, unknown>; description: string }>;
}

export interface PluginValidationResult {
  ok: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
  warnings?: string[];
}
