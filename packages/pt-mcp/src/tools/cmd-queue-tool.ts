import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok } from "./mcp-response.js";
import { globalCmdQueue } from "../queue/cmd-queue.js";

export function registerCmdQueueTool(ctx: RegisterToolContext): void {
  ctx.server.registerTool(
    "pt_cmd_queue",
    {
      title: "Packet Tracer command queue",
      description: "Inspecciona o limpia jobs terminados de la cola MCP de comandos.",
      inputSchema: z.object({
        op: z.enum(["status", "clear_finished"]).default("status"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: any) => {
      if (input.op === "clear_finished") {
        const cleared = globalCmdQueue.clearFinished();
        return ok({
          action: "cmd.queue.clear_finished",
          cleared,
          queue: globalCmdQueue.snapshot(),
        });
      }

      return ok({
        action: "cmd.queue.status",
        queue: globalCmdQueue.snapshot(),
      });
    },
  );
}
