import { afterEach, describe, expect, test, vi } from "bun:test";

let capturedOptions: Array<{ root?: string; role?: string; resultTimeoutMs?: number }> = [];

vi.mock("@cisco-auto/file-bridge", () => ({
  FileBridgeV2: class FakeFileBridgeV2 {
    root: string;
    role: string;
    resultTimeoutMs?: number;

    constructor(options: { root: string; role: string; resultTimeoutMs?: number }) {
      this.root = options.root;
      this.role = options.role;
      this.resultTimeoutMs = options.resultTimeoutMs;
      capturedOptions.push(options);
    }

    start() {}
    stop() {
      return Promise.resolve();
    }
    sendCommandAndWait() {
      return Promise.resolve(null as never);
    }
    readState() {
      return null;
    }
    getStateSnapshot() {
      return null;
    }
    getHeartbeat() {
      return null;
    }
    getHeartbeatHealth() {
      return { state: "missing" as const };
    }
    getBridgeStatus() {
      return { ready: true };
    }
    getContext() {
      return { bridgeReady: true, heartbeat: { state: "missing" as const } };
    }
    on() {
      return this;
    }
    onAll() {
      return () => {};
    }
    loadRuntime() {
      return Promise.resolve();
    }
    loadRuntimeFromFile() {
      return Promise.resolve();
    }
    isReady() {
      return true;
    }
  },
}));

import { createPTController } from "./factory.js";

describe("createPTController", () => {
  const originalPtDevDir = process.env.PT_DEV_DIR;

  afterEach(() => {
    capturedOptions = [];
    if (originalPtDevDir === undefined) {
      delete process.env.PT_DEV_DIR;
    } else {
      process.env.PT_DEV_DIR = originalPtDevDir;
    }
  });

  test("normaliza PT_DEV_DIR Windows antes de construir el bridge", () => {
    process.env.PT_DEV_DIR = "C:\\Users\\Andres\\pt-dev\\";

    createPTController();

    expect(capturedOptions[0]?.root).toBe("C:/Users/Andres/pt-dev");
  });
});
