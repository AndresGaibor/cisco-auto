import { describe, expect, test } from 'bun:test';
import * as pluginApiModule from '../../src/plugin-api/index.js';
import type { BackendPlugin, DevicePlugin, ProtocolPlugin } from '../../src/plugin-api/index.js';

describe('plugin interfaces', () => {
  test('exports the module', () => {
    expect(pluginApiModule).toBeDefined();
  });

  test('accept simple plugin implementations', () => {
    const backend = {
      async connect() {},
      async disconnect() {},
      isConnected() {
        return true;
      },
    };

    const protocolPlugin: ProtocolPlugin = {
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

    const devicePlugin: DevicePlugin = {
      category: 'device',
      name: 'router-2911',
      version: '1.0.0',
      supportedModels: ['2911'],
      validate() {
        return { ok: true, errors: [] };
      },
    };

    const backendPlugin: BackendPlugin = {
      category: 'backend',
      name: 'packet-tracer',
      version: '1.0.0',
      connect: backend.connect,
      disconnect: backend.disconnect,
      isConnected: backend.isConnected,
      validate() {
        return { ok: true, errors: [] };
      },
    };

    expect(protocolPlugin.category).toBe('routing');
    expect(devicePlugin.category).toBe('device');
    expect(backendPlugin.category).toBe('backend');
  });
});
