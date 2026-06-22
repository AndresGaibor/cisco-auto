import { Hono } from "hono";
import type { FileBridgeV2 } from "@cisco-auto/file-bridge";
import type { CommandRequest, CommandResponse } from "./types.js";

export function createRouter(bridge: FileBridgeV2): Hono {
  const router = new Hono();

  router.post("/api/v1/command", async (c) => {
    const body = await c.req.json<CommandRequest>();

    if (!body.type || typeof body.type !== "string") {
      return c.json({ error: "type is required" }, 400);
    }

    const envelope = bridge.sendCommand(
      body.type,
      body.payload ?? {},
      body.expiresAtMs
    );

    const response: CommandResponse = {
      id: envelope.id,
      seq: envelope.seq,
      status: "queued",
    };

    return c.json(response, 202);
  });

  router.post("/api/v1/command-and-wait", async (c) => {
    const body = await c.req.json<CommandRequest>();
    const timeoutMs = body.timeoutMs ?? 120_000;

    if (!body.type || typeof body.type !== "string") {
      return c.json({ error: "type is required" }, 400);
    }

    try {
      const result = await bridge.sendCommandAndWait(
        body.type,
        body.payload ?? {},
        timeoutMs
      );
      return c.json(result);
    } catch (err) {
      return c.json({ error: String(err) }, 408);
    }
  });

  router.get("/api/v1/result/:id", async (c) => {
    const id = c.req.param("id");
    const result = bridge.readState(id);
    if (!result) {
      return c.json({ error: "Result not found" }, 404);
    }
    return c.json(result);
  });

  return router;
}
