import { randomUUID } from "node:crypto";

import {
  createDefaultPTController,
} from "@cisco-auto/pt-control/controller";

import {
  createTerminalCommandService,
} from "@cisco-auto/pt-control/services";

import type { RuntimeTerminalPort } from "@cisco-auto/pt-control/ports";

export interface McpControlContext {
  controller: ReturnType<typeof createDefaultPTController>;
  terminalCommandService: ReturnType<typeof createTerminalCommandService>;
  deviceKindCache: {
    get(device: string): string | undefined;
    set(device: string, kind: string): void;
    clear(): void;
  };
  start(): Promise<void>;
  stop(): Promise<void>;
}

function createDeviceKindCache(ttlMs = 300_000) {
  const cache = new Map<string, { kind: string; expiresAt: number }>();

  return {
    get(device: string): string | undefined {
      const entry = cache.get(device);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        cache.delete(device);
        return undefined;
      }
      return entry.kind;
    },
    set(device: string, kind: string): void {
      cache.set(device, { kind, expiresAt: Date.now() + ttlMs });
    },
    clear(): void {
      cache.clear();
    },
  };
}

function createRuntimeTerminalForMcp(controller: ReturnType<typeof createDefaultPTController>): RuntimeTerminalPort {
  return {
    runTerminalPlan: controller.runTerminalPlan.bind(controller),
    ensureSession: controller.ensureTerminalSession.bind(controller),
    pollTerminalJob: async () => null,
  };
}

export function createMcpControlContext(): McpControlContext {
  const controller = createDefaultPTController();

  const deviceKindCache = createDeviceKindCache();

  const terminalCommandService = createTerminalCommandService({
    controller: controller as any,
    runtimeTerminal: createRuntimeTerminalForMcp(controller),
    generateId: () => `mcp-cmd-${randomUUID().slice(0, 8)}`,
    deviceKindCache,
  });

  return {
    controller,
    terminalCommandService,
    deviceKindCache,
    async start() {
      await controller.start();
    },
    async stop() {
      await controller.stop();
    },
  };
}
