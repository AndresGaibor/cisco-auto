import { Command } from "commander";
import {
  startSimpleSession,
  connectSimpleSession,
  stopSimpleSession,
  readSessionFile,
  readClientConfig,
  readHostConfig,
  resetClientUrl,
  getSavedUrl,
} from "@cisco-auto/pt-collab";
import { createDefaultPTController } from "@cisco-auto/pt-control/controller";
import { ExitCodes } from "../../../errors/index.js";
import { getGlobalFlags } from "../../../flags.js";
import { checkForGitUpdates, setupRealtimeLogging } from "../helpers.js";
import chalk from "chalk";

// ─── start ───────────────────────────────────────────────────────────
export function createStartCommand(): Command {
  return new Command("start")
    .description("Inicia PT Collab como host y publica vía Tailscale Funnel")
    .option("--port <port>", "Puerto local", (v: string) => Number(v), 3937)
    .option("--public-port <port>", "Puerto público del funnel (443|8443|10000)", (v: string) => Number(v), 8443)
    .option("--no-open", "No abrir navegador", false)
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
      const port = typeof opts.port === "number" ? opts.port : 3937;
      const publicPort = typeof opts.publicPort === "number" ? (opts.publicPort as 443 | 8443 | 10000) : 8443;

      await checkForGitUpdates(json);

      try {
        const controller = createDefaultPTController();
        await controller.start();
        const session = await startSimpleSession({ port, publicPort, controller });

        if (json) {
          process.stdout.write(JSON.stringify({
            ok: true,
            service: "pt-collab",
            mode: "host",
            url: session.publicUrl,
            localUrl: session.localUrl,
          }, null, 2) + "\n");
          return;
        }

        process.stdout.write(
          "\n" +
          "PT Collab iniciado.\n" +
          "\n" +
          "Comparte esta URL con los colaboradores:\n" +
          "\n" +
          `  ${session.publicUrl}\n` +
          "\n" +
          "Cuando terminen, cierra esta terminal con Ctrl+C.\n" +
          "\n",
        );

        if (session.client) {
          setupRealtimeLogging(session.client);
        }

        await new Promise<void>((resolve) => {
          const shutdown = async () => {
            process.off("SIGINT", shutdown);
            process.off("SIGTERM", shutdown);
            process.stdout.write("\nDeteniendo PT Collab...\n");
            await session.close();
            await controller.stop().catch(() => {});
            resolve();
          };
          process.once("SIGINT", shutdown);
          process.once("SIGTERM", shutdown);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (json) {
          process.stdout.write(JSON.stringify({ ok: false, error: message }) + "\n");
        } else {
          process.stderr.write(`Error: ${message}\n`);
        }
        process.exit(ExitCodes.ERROR);
      }
    });
}

// ─── connect ─────────────────────────────────────────────────────────
export function createConnectCommand(): Command {
  return new Command("connect")
    .description("Conectarse a una sesión de PT Collab")
    .argument("[url]", "URL pública del host (solo primera vez)")
    .option("--name <name>", "Nombre visible en la sesión")
    .option("--reset-url", "Borrar URL guardada y pedir una nueva", false)
    .option("--json", "Salida en JSON", false)
    .action(async function (url: string | undefined, opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
      const reset = opts.resetUrl === true;
      const name = opts.name ? String(opts.name) : undefined;

      await checkForGitUpdates(json);

      try {
        if (reset) {
          resetClientUrl();
          url = undefined;
        }

        if (!url) {
          url = getSavedUrl();
        }

        if (!url) {
          if (json) {
            process.stdout.write(JSON.stringify({
              ok: false, error: "no_url",
              message: "Pega la URL de PT Collab usando: bun run pt collab connect <url>",
            }) + "\n");
          } else {
            process.stderr.write(
              "Pega la URL de PT Collab:\n" +
              "  bun run pt collab connect https://host.ts.net/collab/s/...\n",
            );
          }
          process.exit(ExitCodes.INVALID_USAGE);
        }

        const controller = createDefaultPTController();
        await controller.start();

        const result = await connectSimpleSession({ url, name, controller });
        const client = result.client;
        const bootstrap = result.coordinator?.getBootstrapResult();

        if (json) {
          process.stdout.write(JSON.stringify({
            ok: true,
            service: "pt-collab",
            mode: "client",
            connected: true,
            peerId: client.peerId,
            peers: client.peers.length,
            url,
            bootstrap: {
              checked: bootstrap?.checked ?? false,
              checkpointId: bootstrap?.checkpointId ?? null,
              downloaded: bootstrap?.downloaded ?? false,
              opened: bootstrap?.opened ?? false,
              skippedExistingProject: bootstrap?.skippedExistingProject ?? false,
              tempPath: bootstrap?.tempPath ?? null,
              error: bootstrap?.error ?? null,
            },
          }, null, 2) + "\n");
          return;
        }

        let syncLine = "Sincronización:";
        if (bootstrap?.checked) {
          if (bootstrap.skippedExistingProject) {
            syncLine += " activa";
          } else if (bootstrap.error) {
            syncLine += " error";
          } else if (bootstrap.opened) {
            syncLine += " activa";
          } else {
            syncLine += " incubando";
          }
        } else {
          syncLine += " pendientes";
        }

        function formatBootstrapLine(b: typeof bootstrap): string {
          if (!b?.checked) return "Checkpoint inicial: pendiente";
          if (b.skippedExistingProject) return "Checkpoint inicial: omitido (lab ya abierto)";
          if (!b.checkpointId) return `Checkpoint inicial: no disponible${b.error ? ` (${b.error})` : ""}`;
          if (b.opened) return `Checkpoint inicial: abierto ${b.checkpointId}`;
          if (b.downloaded) return `Checkpoint inicial: descargado pero NO abierto ${b.checkpointId}`;
          return `Checkpoint inicial: error ${b.checkpointId}: ${b.error ?? "unknown"}`;
        }

        process.stdout.write(
          `Conectado a PT Collab.\n` +
          `${formatBootstrapLine(bootstrap)}\n` +
          `Peers: ${client.peers.length}\n` +
          `${syncLine}\n` +
          `Conflictos: 0\n`,
        );

        if (bootstrap?.error && !bootstrap.opened && !bootstrap.skippedExistingProject) {
          process.stderr.write(
            `Advertencia: no se pudo abrir el checkpoint inicial.\n` +
            `Detalle: ${bootstrap.error}\n` +
            (bootstrap.tempPath ? `Temp: ${bootstrap.tempPath}\n` : ""),
          );
        }

        setupRealtimeLogging(client);

        process.on("SIGINT", () => {
          result.close().finally(() => process.exit(0));
        });

        await new Promise(() => {});
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "NO_URL") {
          if (json) {
            process.stdout.write(JSON.stringify({
              ok: false, error: "no_url",
              message: "No hay URL guardada. Usa: bun run pt collab connect <url>",
            }) + "\n");
          } else {
            process.stderr.write(
              "No hay URL guardada.\n" +
              "Usa: bun run pt collab connect https://host.ts.net/collab/s/...\n",
            );
          }
        } else {
          if (json) {
            process.stdout.write(JSON.stringify({ ok: false, error: message }) + "\n");
          } else {
            process.stderr.write(`Error: ${message}\n`);
          }
        }
        process.exit(ExitCodes.ERROR);
      }
    });
}

// ─── stop ────────────────────────────────────────────────────────────
export function createStopCommand(): Command {
  return new Command("stop")
    .description("Detiene la sesión activa de PT Collab")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;

      try {
        const result = await stopSimpleSession();

        if (json) {
          process.stdout.write(JSON.stringify({
            ok: true,
            hadSession: result.hadSession,
            mode: result.mode,
          }, null, 2) + "\n");
          return;
        }

        if (result.hadSession) {
          process.stdout.write("PT Collab detenido.\n");
        } else {
          process.stdout.write("No había sesión activa de PT Collab.\n");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (json) {
          process.stdout.write(JSON.stringify({ ok: false, error: message }) + "\n");
        } else {
          process.stderr.write(`Error: ${message}\n`);
        }
      }
    });
}

// ─── status ──────────────────────────────────────────────────────────
export function createStatusCommand(): Command {
  return new Command("status")
    .description("Muestra el estado de PT Collab")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
      const session = readSessionFile();
      const hostConfig = readHostConfig();

      const info = {
        ok: true,
        service: "pt-collab",
        active: !!session,
        mode: session?.mode ?? null,
        url: session?.publicUrl ?? null,
        startedAt: session?.startedAt ?? null,
        pid: session?.pid ?? null,
        hostConfigured: !!hostConfig,
        hasSessionSecret: !!hostConfig?.sessionSecret,
      };

      if (json) {
        process.stdout.write(JSON.stringify(info, null, 2) + "\n");
        return;
      }

      if (!session) {
        process.stdout.write(
          "PT Collab: inactivo\n" +
          (hostConfig ? `URL guardada: ${hostConfig.lastPublicUrl ?? "ninguna"}\n` : ""),
        );
        return;
      }

      process.stdout.write(
        `PT Collab\n` +
        `Estado: ${session.mode === "host" ? "host" : "conectado"}\n` +
        (session.publicUrl ? `URL: ${session.publicUrl}\n` : "") +
        `Iniciado: ${session.startedAt}\n`,
      );
    });
}

// ─── doctor ──────────────────────────────────────────────────────────
export function createDoctorCommand(): Command {
  return new Command("doctor")
    .description("Diagnóstico del estado de PT Collab y Tailscale Funnel")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
      const session = readSessionFile();
      const clientConfig = readClientConfig();
      const hostConfig = readHostConfig();

      if (json) {
        process.stdout.write(JSON.stringify({
          ok: true,
          session,
          clientConfig,
          hostConfig,
        }, null, 2) + "\n");
        return;
      }

      process.stdout.write("=== PT Collab Doctor ===\n\n");

      if (session) {
        process.stdout.write(
          `Sesión activa: ${session.mode}\n` +
          `URL: ${session.publicUrl ?? "N/A"}\n` +
          `PID: ${session.pid}\n` +
          `Iniciado: ${session.startedAt}\n\n`,
        );
      } else {
        process.stdout.write("Sesión activa: no\n\n");
      }

      process.stdout.write("--- Host config ---\n");
      if (hostConfig) {
        process.stdout.write(
          `Session secret: ${hostConfig.sessionSecret ? "configurado" : "no configurado"}\n` +
          `Puerto: ${hostConfig.lastPort}\n` +
          `Última URL: ${hostConfig.lastPublicUrl ?? "N/A"}\n`,
        );
      } else {
        process.stdout.write("No configurado\n");
      }

      process.stdout.write("\n--- Client config ---\n");
      if (clientConfig) {
        process.stdout.write(
          `URL guardada: ${clientConfig.lastUrl ?? "N/A"}\n` +
          `Peer ID: ${clientConfig.peerId ?? "N/A"}\n` +
          `Nombre: ${clientConfig.displayName ?? "N/A"}\n`,
        );
      } else {
        process.stdout.write("No configurado\n");
      }
    });
}

// ─── reset-url ───────────────────────────────────────────────────────
export function createResetUrlCommand(): Command {
  return new Command("reset-url")
    .description("Borra la URL guardada de la sesión anterior")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>, command: Command) {
      resetClientUrl();
      const json = opts.json === true || getGlobalFlags(command).json;
      if (json) {
        process.stdout.write(JSON.stringify({ ok: true, action: "url_reset" }) + "\n");
      } else {
        process.stdout.write("URL guardada eliminada.\n");
      }
    });
}
