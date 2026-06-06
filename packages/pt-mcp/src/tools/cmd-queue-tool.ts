import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { instructivo } from "./mcp-response.js";
import { CmdQueueOutputSchema } from "./output-schemas.js";
import { globalCmdQueue } from "../queue/cmd-queue.js";

export function registerCmdQueueTool(ctx: RegisterToolContext): void {
  ctx.server.registerTool(
    "pt_cmd_queue",
    {
      title: "Packet Tracer Command Queue",
      description: [
        "Inspects or cleans the MCP command execution queue.",  
        "Use op='status' to see pending/running/done/failed IOS jobs — read-only and safe to call repeatedly.",
        "Use op='clear_finished' only to remove completed queue records; it does not cancel running Packet Tracer commands.",
      ].join(" "),
      inputSchema: z.object({
        op: z.enum(["status", "clear_finished"]).default("status").describe(
          "status: muestra el estado actual de la cola (pendientes, ejecutando, completados, fallidos). clear_finished: limpia solo jobs terminados.",
        ),
      }),
      outputSchema: CmdQueueOutputSchema,
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
        return instructivo("pt_cmd_queue", {
          action: "cmd.queue.clear_finished",
          cleared,
          queue: globalCmdQueue.snapshot(),
        });
      }

      return instructivo("pt_cmd_queue", {
        action: "cmd.queue.status",
        queue: globalCmdQueue.snapshot(),
      });
    },
  );
}
