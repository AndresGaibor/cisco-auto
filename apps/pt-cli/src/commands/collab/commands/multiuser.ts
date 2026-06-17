import { Command } from "commander";
import {
  queryMultiuserIPC,
  multiuserListenIPC,
  multiuserStopIPC,
  multiuserConnectIPC,
  createEmptyMultiuserStatus,
} from "@cisco-auto/pt-collab";
import { createDefaultPTController } from "@cisco-auto/pt-control/controller";
import { getGlobalFlags } from "../../../flags.js";

export function createMultiuserCommand(): Command {
  const multiuser = new Command("multiuser")
    .description("Controla Multiuser nativo de Packet Tracer");

  multiuser.addCommand(
    new Command("status")
      .description("Estado de Multiuser")
      .option("--json", "Salida en JSON", false)
      .action(async function (opts: Record<string, unknown>, command: Command) {
        const json = opts.json === true || getGlobalFlags(command).json;
        try {
          const controller = createDefaultPTController();
          await controller.start();
          const bridge = controller.getBridge();
          const result = await queryMultiuserIPC(
            (type: string, payload: unknown, timeoutMs?: number) => bridge.sendCommandAndWait(type, payload, timeoutMs),
          );
          await controller.stop();

          const status = result
            ? {
                serverRunning: result.port > 0,
                listenPort: result.port > 0 ? result.port : undefined,
                localName: result.name,
                enabled: result.enabled,
                clientCount: result.clients,
                connections: [],
              }
            : createEmptyMultiuserStatus();

          if (json) {
            process.stdout.write(JSON.stringify({ ok: true, ...status }, null, 2) + "\n");
          } else {
            process.stdout.write(
              `Multiuser:    ${status.serverRunning ? "activo" : "inactivo"}\n` +
              `Puerto:       ${status.listenPort ?? "N/A"}\n` +
              `Nombre local: ${status.localName}\n` +
              `Clientes:     ${status.clientCount}\n`,
            );
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (json) {
            process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
          } else {
            process.stderr.write(`Error consultando Multiuser: ${msg}\n`);
          }
        }
      }),
  );

  multiuser.addCommand(
    new Command("listen")
      .description("Inicia servidor Multiuser")
      .option("--port <port>", "Puerto", (v: string) => Number(v), 38000)
      .option("--password <pass>", "Contraseña", "cisco")
      .option("--accept <mode>", "Modo accept (always/never/manual)", "always")
      .option("--json", "Salida en JSON", false)
      .action(async function (opts: Record<string, unknown>, command: Command) {
        const json = opts.json === true || getGlobalFlags(command).json;
        try {
          const controller = createDefaultPTController();
          await controller.start();
          const bridge = controller.getBridge();
          const result = await multiuserListenIPC(
            (type: string, payload: unknown, timeoutMs?: number) => bridge.sendCommandAndWait(type, payload, timeoutMs),
            {
              port: Number(opts.port ?? 38000),
              password: String(opts.password ?? "cisco"),
              acceptMode: (opts.accept as "always" | "never" | "manual") ?? "always",
            },
          );
          await controller.stop();

          if (json) {
            process.stdout.write(JSON.stringify(result, null, 2) + "\n");
          } else {
            process.stdout.write(
              `Servidor Multiuser iniciado en puerto ${result.port}\n`,
            );
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (json) {
            process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
          } else {
            process.stderr.write(`Error iniciando Multiuser: ${msg}\n`);
          }
        }
      }),
  );

  multiuser.addCommand(
    new Command("stop")
      .description("Detiene servidor Multiuser")
      .option("--json", "Salida en JSON", false)
      .action(async function (opts: Record<string, unknown>, command: Command) {
        const json = opts.json === true || getGlobalFlags(command).json;
        try {
          const controller = createDefaultPTController();
          await controller.start();
          const bridge = controller.getBridge();
          await multiuserStopIPC(
            (type: string, payload: unknown, timeoutMs?: number) => bridge.sendCommandAndWait(type, payload, timeoutMs),
          );
          await controller.stop();

          if (json) {
            process.stdout.write(JSON.stringify({ ok: true }) + "\n");
          } else {
            process.stdout.write("Servidor Multiuser detenido\n");
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (json) {
            process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
          } else {
            process.stderr.write("Error deteniendo Multiuser: " + msg + "\n");
          }
        }
      }),
  );

  multiuser.addCommand(
    new Command("connect")
      .description("Conecta a un peer Multiuser")
      .option("--host <host>", "Host del peer")
      .option("--port <port>", "Puerto", (v: string) => Number(v), 38000)
      .option("--password <pass>", "Contraseña", "cisco")
      .option("--name <name>", "Nombre de conexión")
      .option("--json", "Salida en JSON", false)
      .action(async function (opts: Record<string, unknown>, command: Command) {
        const json = opts.json === true || getGlobalFlags(command).json;
        const host = opts.host ? String(opts.host) : null;
        if (!host) {
          if (json) {
            process.stdout.write(JSON.stringify({ ok: false, error: "Se requiere --host" }) + "\n");
          } else {
            process.stderr.write("Usa --host <host> para conectar\n");
          }
          return;
        }
        try {
          const controller = createDefaultPTController();
          await controller.start();
          const bridge = controller.getBridge();
          const result = await multiuserConnectIPC(
            (type: string, payload: unknown, timeoutMs?: number) => bridge.sendCommandAndWait(type, payload, timeoutMs),
            {
              host,
              port: Number(opts.port ?? 38000),
              password: String(opts.password ?? "cisco"),
              name: opts.name ? String(opts.name) : undefined,
            },
          );
          await controller.stop();

          if (json) {
            process.stdout.write(JSON.stringify(result) + "\n");
          } else {
            process.stdout.write("Conectado a " + host + ":" + String(opts.port ?? 38000) + "\n");
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (json) {
            process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
          } else {
            process.stderr.write("Error conectando Multiuser: " + msg + "\n");
          }
        }
      }),
  );

  return multiuser;
}
