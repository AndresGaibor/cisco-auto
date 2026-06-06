import { describe, expect, test } from "bun:test";
import { CliSession } from "./cli-session.js";
import type { CommandHandler } from "./command-handler.js";

describe("CliSession.recoverFromUnknownState", () => {
  test("repite resync, end y disable hasta recuperar el prompt", async () => {
    const comandos: string[] = [];
    const respuestas = ["ruido", "todavía ruido", "Router1#"];

    const handler: CommandHandler = {
      enterCommand(cmd: string): [number, string] {
        comandos.push(cmd);
        const respuesta = respuestas[Math.min(comandos.length - 1, respuestas.length - 1)] ?? "Router1#";
        return [0, respuesta];
      },
    };

    const session = new CliSession("Router1", handler, { commandTimeout: 1000 });
    session.markDesynced("prompt perdido");
    (session as any).state.mode = "unknown";

    const recovered = await session.recoverFromUnknownState();

    expect(recovered).toBe(true);
    expect(session.getState().mode).toBe("privileged-exec");
    expect(session.getState().desynced).toBe(false);
    expect(comandos).toEqual(["", "end", ""]);
  });
});
