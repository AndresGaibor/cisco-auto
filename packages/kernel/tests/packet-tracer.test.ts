import { describe, expect, test } from 'bun:test';
import { createPacketTracerAdapter } from '../src/backends/packet-tracer/packet-tracer.adapter.js';

describe('packet-tracer backend', () => {
  test('does not report connected when start fails', async () => {
    const adapter = createPacketTracerAdapter({
      createController() {
        return {
          start: async () => {
            throw new Error('boom');
          },
          stop: async () => undefined,
          addDevice: async () => undefined,
          removeDevice: async () => undefined,
          configIosWithResult: async () => undefined,
          show: async () => undefined,
          showVlan: async () => undefined,
          addLink: async () => undefined,
          removeLink: async () => undefined,
          snapshot: async () => undefined,
        };
      },
    });

    await expect(adapter.connect({ devDir: '/tmp/pt-dev' })).rejects.toThrow('boom');
    expect(adapter.isConnected()).toBe(false);

    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });
});
