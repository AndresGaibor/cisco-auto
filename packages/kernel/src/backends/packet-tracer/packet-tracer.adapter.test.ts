import { describe, expect, test } from 'bun:test';
import { createPacketTracerAdapter } from './packet-tracer.adapter.js';

describe('packet-tracer adapter', () => {
  test('keeps the adapter disconnected when start fails', async () => {
    let stopCalled = false;
    const adapter = createPacketTracerAdapter({
      createController() {
        return {
          start: async () => {
            throw new Error('start failed');
          },
          stop: async () => {
            stopCalled = true;
          },
          addDevice: async () => undefined,
          removeDevice: async () => undefined,
          configIosWithResult: async () => undefined,
          show: async () => undefined,
          showVlan: async () => undefined,
          addLink: async () => undefined,
          removeLink: async () => undefined,
          snapshot: async () => undefined,
          getTopology: async () => undefined,
        };
      },
    });

    await expect(adapter.connect({ devDir: '/tmp/pt-dev' })).rejects.toThrow('start failed');
    expect(adapter.isConnected()).toBe(false);

    await adapter.disconnect();
    expect(stopCalled).toBe(false);
  });

  test('clears the connection state after disconnect', async () => {
    let stopCalled = false;
    const adapter = createPacketTracerAdapter({
      createController() {
        return {
          start: async () => undefined,
          stop: async () => {
            stopCalled = true;
          },
          addDevice: async () => undefined,
          removeDevice: async () => undefined,
          configIosWithResult: async () => undefined,
          show: async () => undefined,
          showVlan: async () => undefined,
          addLink: async () => undefined,
          removeLink: async () => undefined,
          snapshot: async () => undefined,
          getTopology: async () => undefined,
        };
      },
    });

    await adapter.connect({ devDir: '/tmp/pt-dev' });
    expect(adapter.isConnected()).toBe(true);

    await adapter.disconnect();
    expect(stopCalled).toBe(true);
    expect(adapter.isConnected()).toBe(false);
  });
});
