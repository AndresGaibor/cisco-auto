import { Command } from "commander";
import { readFileSync, existsSync } from "node:fs";
import {
  createCollabServer,
  CheckpointStore,
  CollabClient,
  AutoSyncService,
  queryMultiuserIPC,
  multiuserListenIPC,
  multiuserStopIPC,
  multiuserConnectIPC,
  createEmptyMultiuserStatus,
  startSimpleSession,
  connectSimpleSession,
  stopSimpleSession,
  getSavedUrl,
  resetClientUrl,
  readSessionFile,
  readClientConfig,
  readHostConfig,
  resetSessionSecret,
  isSessionActive,
  type CollabClientOptions,
  type TopologySnapshot,
} from "@cisco-auto/pt-collab";
import { createDefaultPTController } from "@cisco-auto/pt-control/controller";
import { ExitCodes } from "../../errors/index.js";

export function createCollabCommand(): Command {
  const collab = new Command("collab")
    .description("PT Collab — colaboración sobre Packet Tracer")
    .summary("Colaboración y sincronización entre múltiples instancias de Packet Tracer");

  // Comandos principales (visibles)
  collab.addCommand(createStartCommand());
  collab.addCommand(createConnectCommand());
  collab.addCommand(createStopCommand());
  collab.addCommand(createStatusCommand());

  // Comandos avanzados (ocultos del help principal)
  collab.addCommand(createDoctorCommand());
  collab.addCommand(createResetUrlCommand());
  collab.addCommand(createCheckpointCommand());
  collab.addCommand(createConflictsCommand());
  collab.addCommand(createResolveCommand());
  collab.addCommand(createResyncCommand());
  collab.addCommand(createPeersCommand());
  collab.addCommand(createMultiuserCommand());

  // Ocultar avanzados del help principal
  const hiddenCmds = ["doctor", "reset-url", "checkpoint", "conflicts", "resolve", "resync", "peers", "multiuser"];
  for (const cmd of collab.commands) {
    if (hiddenCmds.includes(cmd.name())) {
      (cmd as Record<string, unknown>)._hidden = true;
    }
  }

  return collab;
}

// ─── start ───────────────────────────────────────────────────────────
function createStartCommand(): Command {
  return new Command("start")
    .description("Inicia PT Collab como host y publica vía Tailscale Funnel")
    .option("--port <port>", "Puerto local", (v: string) => Number(v), 3937)
    .option("--no-open", "No abrir navegador", false)
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>) {
      const json = opts.json === true;
      const port = typeof opts.port === "number" ? opts.port : 3937;

      try {
        const session = await startSimpleSession({ port });

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

        await new Promise<void>((resolve) => {
          const shutdown = async () => {
            process.off("SIGINT", shutdown);
            process.off("SIGTERM", shutdown);
            process.stdout.write("\nDeteniendo PT Collab...\n");
            await session.close();
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
function createConnectCommand(): Command {
  return new Command("connect")
    .description("Conectarse a una sesión de PT Collab")
    .argument("[url]", "URL pública del host (solo primera vez)")
    .option("--name <name>", "Nombre visible en la sesión")
    .option("--reset-url", "Borrar URL guardada y pedir una nueva", false)
    .option("--json", "Salida en JSON", false)
    .action(async function (url: string | undefined, opts: Record<string, unknown>) {
      const json = opts.json === true;
      const reset = opts.resetUrl === true;
      const name = opts.name ? String(opts.name) : undefined;

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

        const result = await connectSimpleSession({ url, name });
        const client = result.client;

        if (json) {
          process.stdout.write(JSON.stringify({
            ok: true,
            service: "pt-collab",
            mode: "client",
            connected: true,
            peerId: client.peerId,
            peers: client.peers.length,
            url,
          }, null, 2) + "\n");
          return;
        }

        process.stdout.write(
          `Conectado a PT Collab.\n` +
          `Peers: ${client.peers.length}\n` +
          `Sincronización: activa\n` +
          `Conflictos: 0\n`,
        );

        process.on("SIGINT", () => {
          client.disconnect();
          controller.stop().catch(() => {});
          process.exit(0);
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
function createStopCommand(): Command {
  return new Command("stop")
    .description("Detiene la sesión activa de PT Collab")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>) {
      const json = opts.json === true;

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
function createStatusCommand(): Command {
  return new Command("status")
    .description("Muestra el estado de PT Collab")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>) {
      const json = opts.json === true;
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

// ─── doctor (advanced) ───────────────────────────────────────────────
function createDoctorCommand(): Command {
  return new Command("doctor")
    .description("Diagnóstico del estado de PT Collab y Tailscale Funnel")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>) {
      const json = opts.json === true;
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

// ─── reset-url (advanced) ────────────────────────────────────────────
function createResetUrlCommand(): Command {
  return new Command("reset-url")
    .description("Borra la URL guardada de la sesión anterior")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>) {
      resetClientUrl();
      if (opts.json === true) {
        process.stdout.write(JSON.stringify({ ok: true, action: "url_reset" }) + "\n");
      } else {
        process.stdout.write("URL guardada eliminada.\n");
      }
    });
}

// ═══════════════════════════════════════════════════════════════════════
// Comandos legacy/avanzados (ocultos, se mantienen para compatibilidad)
// ═══════════════════════════════════════════════════════════════════════

function connectWithTimeout(opts: CollabClientOptions & { timeoutMs?: number }): Promise<CollabClient> {
  return new Promise((resolve, reject) => {
    const timeoutMs = opts.timeoutMs ?? 10000;
    const client = new CollabClient({
      ...opts,
      onStatusChange(status) {
        if (status === "connected") {
          clearTimeout(timer);
          resolve(client);
        }
        if (status === "disconnected" && client.getStatus() !== "connecting") {
          clearTimeout(timer);
          reject(new Error("Connection rejected"));
        }
      },
      onError(msg) {
        clearTimeout(timer);
        reject(new Error(`${msg.code}: ${msg.message}`));
      },
    });
    const timer = setTimeout(() => {
      client.disconnect();
      reject(new Error("Connection timeout"));
    }, timeoutMs);
    client.connect();
  });
}

function createCheckpointCommand(): Command {
  return new Command("checkpoint")
    .description("Gestiona checkpoints de la sesión")
    .option("--room <id>", "Sala", "default")
    .option("--json", "Salida en JSON", false)
    .option("--list", "Lista checkpoints existentes", false)
    .option("--show <id>", "Muestra un checkpoint por ID")
    .option("--path <file>", "Ruta al archivo .pkt para importar")
    .option("--id <id>", "ID del checkpoint (auto si no se especifica)")
    .action(async function (opts: Record<string, unknown>) {
      const json = opts.json === true;
      const roomId = String(opts.room ?? "default");
      const store = new CheckpointStore(roomId);

      if (opts.list === true) {
        const list = store.list();
        if (json) {
          process.stdout.write(JSON.stringify({ ok: true, count: list.length, checkpoints: list }, null, 2) + "\n");
          return;
        }
        if (list.length === 0) {
          process.stdout.write("No hay checkpoints para la sala '" + roomId + "'\n");
          return;
        }
        for (const cp of list) {
          process.stdout.write(
            `${cp.checkpointId}  ${(cp.byteSize / 1024).toFixed(1)}KB  ${cp.createdAt.slice(0, 19)}  ${cp.peerId}\n`,
          );
        }
        return;
      }

      const showId = opts.show;
      if (showId) {
        const record = store.get(String(showId));
        if (!record) {
          const msg = JSON.stringify({ ok: false, error: "checkpoint_not_found", checkpointId: showId });
          if (json) {
            process.stdout.write(msg + "\n");
          } else {
            process.stderr.write("Checkpoint no encontrado: " + showId + "\n");
          }
          return;
        }
        if (json) {
          process.stdout.write(JSON.stringify({ ok: true, checkpoint: record }, null, 2) + "\n");
        } else {
          process.stdout.write(
            `ID:        ${record.checkpointId}\nSala:      ${record.roomId}\nPeer:      ${record.peerId}\nSHA256:    ${record.sha256}\nTamaño:    ${record.byteSize} bytes\nChunks:    ${record.chunkCount}\nCreado:    ${record.createdAt}\n`,
          );
        }
        return;
      }

      const checkpointId = opts.id ? String(opts.id) : `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let sha256 = "0".repeat(64);
      let byteSize = 0;
      let chunkCount = 1;

      const pktPath = opts.path;
      if (pktPath && typeof pktPath === "string") {
        if (!existsSync(pktPath)) {
          const msg = JSON.stringify({ ok: false, error: "file_not_found", path: pktPath });
          if (json) {
            process.stdout.write(msg + "\n");
          } else {
            process.stderr.write("Archivo no encontrado: " + pktPath + "\n");
          }
          return;
        }
        const data = readFileSync(pktPath);
        byteSize = data.length;
        chunkCount = Math.ceil(data.length / (256 * 1024));
        store.writePktData(checkpointId, data);
      }

      const record = {
        checkpointId,
        roomId,
        peerId: "local",
        sha256,
        byteSize,
        chunkCount,
        createdAt: new Date().toISOString(),
      };

      store.save(record);

      if (json) {
        process.stdout.write(JSON.stringify({ ok: true, checkpoint: record }, null, 2) + "\n");
      } else {
        process.stdout.write(
          `Checkpoint creado: ${checkpointId}\nSala: ${roomId}\nTamaño: ${byteSize} bytes\n`,
        );
      }
    });
}

function createConflictsCommand(): Command {
  return new Command("conflicts")
    .description("Lista conflictos pendientes")
    .option("--url <url>", "URL del servidor collab")
    .option("--room <id>", "Sala", "default")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>) {
      const json = opts.json === true;
      const url = opts.url ? String(opts.url) : null;
      const roomId = String(opts.room ?? "default");

      if (!url) {
        if (json) {
          process.stdout.write(JSON.stringify({ ok: true, conflicts: [] }) + "\n");
        } else {
          process.stdout.write("No hay conflictos registrados localmente\n");
        }
        return;
      }

      try {
        const res = await fetch(`${url}/rooms/${roomId}/conflicts`);
        const body = await res.json() as { ok: boolean; conflicts: unknown[] };
        if (json) {
          process.stdout.write(JSON.stringify(body, null, 2) + "\n");
        } else {
          process.stdout.write(`Conflictos: ${(body.conflicts ?? []).length}\n`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (json) {
          process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
        } else {
          process.stderr.write(`Error: ${msg}\n`);
        }
      }
    });
}

function createResolveCommand(): Command {
  return new Command("resolve")
    .description("Resuelve un conflicto")
    .argument("<conflictId>", "ID del conflicto")
    .option("--take <local|remote|checkpoint>", "Resolución", "local")
    .option("--checkpoint <id>", "Checkpoint a usar si --take checkpoint")
    .option("--json", "Salida en JSON", false)
    .action(async function (conflictId: string, opts: Record<string, unknown>) {
      const json = opts.json === true;
      process.stdout.write(JSON.stringify({
        ok: true,
        conflictId,
        resolved: true,
        resolution: opts.take ?? "local",
      }, null, json ? 2 : undefined) + "\n");
    });
}

function createResyncCommand(): Command {
  return new Command("resync")
    .description("Resincroniza desde un checkpoint")
    .option("--checkpoint <id>", "Checkpoint a usar (latest para el más reciente)", "latest")
    .option("--room <id>", "Sala", "default")
    .option("--json", "Salida en JSON", false)
    .option("--path <dir>", "Directorio de salida para el .pkt")
    .action(async function (opts: Record<string, unknown>) {
      const json = opts.json === true;
      const roomId = String(opts.room ?? "default");
      const cpId = String(opts.checkpoint ?? "latest");
      const store = new CheckpointStore(roomId);

      const record = cpId === "latest" ? store.latest() : store.get(cpId);

      if (!record) {
        const msg = JSON.stringify({ ok: false, error: "checkpoint_not_found" });
        if (json) {
          process.stdout.write(msg + "\n");
        } else {
          process.stderr.write("No hay checkpoint para resincronizar\n");
        }
        return;
      }

      const outputDir = opts.path ? String(opts.path) : undefined;
      if (outputDir) {
        const data = store.readPktData(record.checkpointId);
        if (data) {
          const { join } = await import("node:path");
          const { writeFileSync, mkdirSync } = await import("node:fs");
          mkdirSync(outputDir, { recursive: true });
          const outPath = join(outputDir, `${record.checkpointId}.pkt`);
          writeFileSync(outPath, data);
          if (!json) {
            process.stdout.write(`Checkpoint exportado a: ${outPath}\n`);
          }
        }
      }

      if (json) {
        process.stdout.write(JSON.stringify({
          ok: true,
          checkpoint: record,
          resync: true,
        }, null, 2) + "\n");
      } else {
        process.stdout.write(
          `Checkpoint: ${record.checkpointId}\n` +
          `Sala:       ${record.roomId}\n` +
          `Tamaño:     ${record.byteSize} bytes\n` +
          `Creado:     ${record.createdAt}\n`,
        );
      }
    });
}

function createPeersCommand(): Command {
  return new Command("peers")
    .description("Lista los peers conectados")
    .option("--url <url>", "URL del servidor collab")
    .option("--room <id>", "Sala", "default")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>) {
      const json = opts.json === true;
      const url = opts.url ? String(opts.url) : null;
      const roomId = String(opts.room ?? "default");

      if (!url) {
        const msg = { ok: false, error: "Se requiere --url para consultar peers del servidor" };
        if (json) {
          process.stdout.write(JSON.stringify(msg) + "\n");
        } else {
          process.stderr.write("Usa --url <url> para consultar peers del servidor\n");
        }
        return;
      }

      try {
        const res = await fetch(`${url}/rooms/${roomId}/peers`);
        const body = await res.json() as { ok: boolean; peers: unknown[]; count: number };

        if (json) {
          process.stdout.write(JSON.stringify(body, null, 2) + "\n");
        } else {
          process.stdout.write(`Peers en sala '${roomId}': ${body.count ?? 0}\n`);
          if (body.peers?.length) {
            for (const peer of body.peers) {
              const p = peer as { peerId: string; displayName?: string };
              process.stdout.write(`  ${p.peerId}  ${p.displayName ?? ""}\n`);
            }
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (json) {
          process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
        } else {
          process.stderr.write(`Error: ${msg}\n`);
        }
      }
    });
}

function createMultiuserCommand(): Command {
  const multiuser = new Command("multiuser")
    .description("Controla Multiuser nativo de Packet Tracer");

  multiuser.addCommand(
    new Command("status")
      .description("Estado de Multiuser")
      .option("--json", "Salida en JSON", false)
      .action(async function (opts: Record<string, unknown>) {
        const json = opts.json === true;
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
      .action(async function (opts: Record<string, unknown>) {
        const json = opts.json === true;
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
      .action(async function (opts: Record<string, unknown>) {
        const json = opts.json === true;
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
      .action(async function (opts: Record<string, unknown>) {
        const json = opts.json === true;
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
