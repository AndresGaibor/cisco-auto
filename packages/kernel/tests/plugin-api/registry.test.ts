import { describe, expect, test } from 'bun:test';
import { DefaultPluginRegistry } from '../../src/plugin-api/index.js';

describe('plugin registry', () => {
  test('registers, gets and lists plugins by kind', () => {
    const registry = new DefaultPluginRegistry();
    const protocolPlugin = {
      id: 'ospf',
      category: 'routing',
      name: 'ospf',
      version: '1.0.0',
      description: 'OSPF routing plugin',
      commands: [],
      validate() {
        return { ok: true, errors: [] };
      },
    };

    registry.register('protocol', protocolPlugin);

    expect(registry.get('protocol', 'ospf')).toBe(protocolPlugin);
    expect(registry.list('protocol')).toEqual([protocolPlugin]);
  });
});
