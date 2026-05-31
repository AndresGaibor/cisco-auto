import { describe, expect, test } from "bun:test";
import { PTSyncCoordinator } from "../sync/pt-sync-coordinator.js";

describe("PTSyncCoordinator", () => {
  test("expone estado y arranca sin explotar", async () => {
    const client = {
      connectCalls: 0,
      disconnectCalls: 0,
      connect() { this.connectCalls++; },
      disconnect() { this.disconnectCalls++; },
      getStatus() { return "connected" as const; },
      on() { return () => {}; },
      sendMessage() {},
    };

    const coordinator = new PTSyncCoordinator({
      controller: {
        start: async () => {},
        stop: async () => {},
        snapshot: async () => ({ timestamp: Date.now(), devices: {}, links: {}, deviceConfigs: {} }),
        addDevice: async () => ({}),
        removeDevice: async () => {},
        renameDevice: async () => {},
        moveDevice: async () => ({}),
        addLink: async () => ({}),
        removeLink: async () => {},
        configIos: async () => {},
      },
      client: client as never,
      peerId: "peer-1",
      roomId: "default",
    });

    await coordinator.start();
    expect(client.connectCalls).toBe(1);
    expect(coordinator.getStatus().peerId).toBe("peer-1");
    await coordinator.stop();
    expect(client.disconnectCalls).toBe(1);
  });
});
