import { describe, expect, test } from 'bun:test';
import { createPacketTracerBackendPlugin } from './packet-tracer.plugin.js';

function createFakeAdapter() {
  const llamadas: Array<{ metodo: string; args: unknown[] }> = [];
  let conectado = false;

  return {
    llamadas,
    adapter: {
      async connect(config: unknown) {
        llamadas.push({ metodo: 'connect', args: [config] });
        conectado = true;
      },
      async disconnect() {
        llamadas.push({ metodo: 'disconnect', args: [] });
        conectado = false;
      },
      isConnected() {
        return conectado;
      },
      async addDevice(name: string, model: string, options?: { x?: number; y?: number }) {
        llamadas.push({ metodo: 'addDevice', args: [name, model, options] });
        return { name, model, options };
      },
      async removeDevice(name: string) {
        llamadas.push({ metodo: 'removeDevice', args: [name] });
      },
      async configureDevice(name: string, commands: string[]) {
        llamadas.push({ metodo: 'configureDevice', args: [name, commands] });
        return { name, commands };
      },
      async execShow(name: string, command: string) {
        llamadas.push({ metodo: 'execShow', args: [name, command] });
        return { name, command };
      },
      async addLink(device1: string, port1: string, device2: string, port2: string) {
        llamadas.push({ metodo: 'addLink', args: [device1, port1, device2, port2] });
        return { device1, port1, device2, port2 };
      },
      async removeLink(device: string, port: string) {
        llamadas.push({ metodo: 'removeLink', args: [device, port] });
      },
      async getTopology() {
        llamadas.push({ metodo: 'getTopology', args: [] });
        return { devices: {}, links: {} };
      },
    },
  };
}

describe('packet-tracer backend plugin', () => {
  test('exposes the expected metadata', () => {
    const { adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    expect(plugin.id).toBe('packet-tracer');
    expect(plugin.name).toBe('Cisco Packet Tracer');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('backend');
    expect(plugin.description).toContain('Packet Tracer');
  });

  test('connect and disconnect toggle the connection state', async () => {
    const { adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    expect(plugin.isConnected()).toBe(false);

    await plugin.connect({ devDir: '/tmp/pt-dev' });
    expect(plugin.isConnected()).toBe(true);

    await plugin.disconnect();
    expect(plugin.isConnected()).toBe(false);
  });

  test('configureDevice delegates the command list to the adapter', async () => {
    const { llamadas, adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    await plugin.connect({ devDir: '/tmp/pt-dev' });
    await plugin.configureDevice('R1', ['enable', 'configure terminal']);

    expect(llamadas).toContainEqual({
      metodo: 'configureDevice',
      args: ['R1', ['enable', 'configure terminal']],
    });
  });

  test('addDevice delegates to the adapter', async () => {
    const { llamadas, adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    await plugin.connect({ devDir: '/tmp/pt-dev' });
    await plugin.addDevice('R1', '2911', { x: 120, y: 80 });

    expect(llamadas).toContainEqual({
      metodo: 'addDevice',
      args: ['R1', '2911', { x: 120, y: 80 }],
    });
  });

  test('removeDevice delegates to the adapter', async () => {
    const { llamadas, adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    await plugin.connect({ devDir: '/tmp/pt-dev' });
    await plugin.removeDevice('R1');

    expect(llamadas).toContainEqual({
      metodo: 'removeDevice',
      args: ['R1'],
    });
  });

  test('addLink delegates to the adapter', async () => {
    const { llamadas, adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    await plugin.connect({ devDir: '/tmp/pt-dev' });
    await plugin.addLink('R1', 'Gi0/0', 'SW1', 'Fa0/1');

    expect(llamadas).toContainEqual({
      metodo: 'addLink',
      args: ['R1', 'Gi0/0', 'SW1', 'Fa0/1'],
    });
  });

  test('removeLink delegates to the adapter', async () => {
    const { llamadas, adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    await plugin.connect({ devDir: '/tmp/pt-dev' });
    await plugin.removeLink('R1', 'Gi0/0');

    expect(llamadas).toContainEqual({
      metodo: 'removeLink',
      args: ['R1', 'Gi0/0'],
    });
  });

  test('getTopology delegates to the adapter', async () => {
    const { llamadas, adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    await plugin.connect({ devDir: '/tmp/pt-dev' });
    await plugin.getTopology();

    expect(llamadas).toContainEqual({
      metodo: 'getTopology',
      args: [],
    });
  });

  test('connect fallida no deja al plugin en estado conectado', async () => {
    const failingAdapter = {
      async connect(_config: unknown) {
        throw new Error('PT is not running');
      },
      async disconnect() {},
      isConnected() {
        return false;
      },
      async addDevice() { return null; },
      async removeDevice() {},
      async configureDevice() { return null; },
      async execShow() { return null; },
      async addLink() { return null; },
      async removeLink() {},
      async getTopology() { return null; },
    };

    const plugin = createPacketTracerBackendPlugin(failingAdapter);
    expect(plugin.isConnected()).toBe(false);

    await expect(plugin.connect({ devDir: '/no-existe' })).rejects.toThrow('PT is not running');
    expect(plugin.isConnected()).toBe(false);
  });

  test('execShow uses show vlan on vlan commands', async () => {
    const { llamadas, adapter } = createFakeAdapter();
    const plugin = createPacketTracerBackendPlugin(adapter);

    await plugin.connect({ devDir: '/tmp/pt-dev' });
    await plugin.execShow('SW1', 'show vlan');

    expect(llamadas).toContainEqual({
      metodo: 'execShow',
      args: ['SW1', 'show vlan'],
    });
  });
});
