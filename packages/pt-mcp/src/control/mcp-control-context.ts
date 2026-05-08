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
  start(): Promise<void>;
  stop(): Promise<void>;
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

  const terminalCommandService = createTerminalCommandService({
    controller: controller as any,
    runtimeTerminal: createRuntimeTerminalForMcp(controller),
    generateId: () => `mcp-cmd-${randomUUID().slice(0, 8)}`,
  });

  return {
    controller,
    terminalCommandService,
    async start() {
      await controller.start();
    },
    async stop() {
      await controller.stop();
    },
  };
}
