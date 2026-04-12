import { describe, expect, test } from 'bun:test';
import * as pluginTypesModule from '../../src/plugin-api/plugin.types.js';
import type { PluginCategory, PluginCommandDefinition, PluginValidationResult } from '../../src/plugin-api/index.js';

describe('plugin types', () => {
  test('exports the module', () => {
    expect(pluginTypesModule).toBeDefined();
  });

  test('exports the supported plugin categories', () => {
    const categorias: PluginCategory[] = ['switching', 'routing', 'security', 'services', 'backend', 'device'];

    expect(categorias).toHaveLength(6);
  });

  test('plugin command definitions can be typed', () => {
    const definicion: PluginCommandDefinition = {
      name: 'vlan-create',
      description: 'Crea una VLAN',
      inputSchema: {} as PluginCommandDefinition['inputSchema'],
      examples: [{ input: { vlanId: 10 }, description: 'Crear una VLAN 10' }],
    };

    expect(definicion.name).toBe('vlan-create');
  });

  test('plugin validation results can be typed', () => {
    const resultado: PluginValidationResult = {
      ok: false,
      errors: [{ path: 'name', message: 'required', code: 'required' }],
      warnings: ['campo opcional'],
    };

    expect(resultado.ok).toBe(false);
  });
});
