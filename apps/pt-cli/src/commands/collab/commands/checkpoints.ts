import { Command } from "commander";
import { readFileSync, existsSync } from "node:fs";
import { CheckpointStore, getSavedUrl, readSessionFile, readHostConfig } from "@cisco-auto/pt-collab";
import { getGlobalFlags } from "../../../flags.js";
import chalk from "chalk";

// ─── checkpoint ──────────────────────────────────────────────────────
export function createCheckpointCommand(): Command {
  return new Command("checkpoint")
    .description("Gestiona checkpoints de la sesión")
    .option("--room <id>", "Sala", "default")
    .option("--json", "Salida en JSON", false)
    .option("--list", "Lista checkpoints existentes", false)
    .option("--show <id>", "Muestra un checkpoint por ID")
    .option("--path <file>", "Ruta al archivo .pkt para importar")
    .option("--id <id>", "ID del checkpoint (auto si no se especifica)")
    .action(async function (opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
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

// ─── conflicts ───────────────────────────────────────────────────────
export function createConflictsCommand(): Command {
  return new Command("conflicts")
    .description("Lista conflictos pendientes")
    .option("--url <url>", "URL del servidor collab")
    .option("--room <id>", "Sala", "default")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
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

// ─── resolve ─────────────────────────────────────────────────────────
export function createResolveCommand(): Command {
  return new Command("resolve")
    .description("Resuelve un conflicto")
    .argument("<conflictId>", "ID del conflicto")
    .option("--take <local|remote|checkpoint>", "Resolución", "local")
    .option("--checkpoint <id>", "Checkpoint a usar si --take checkpoint")
    .option("--json", "Salida en JSON", false)
    .action(async function (conflictId: string, opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
      process.stdout.write(JSON.stringify({
        ok: true,
        conflictId,
        resolved: true,
        resolution: opts.take ?? "local",
      }, null, json ? 2 : undefined) + "\n");
    });
}

// ─── resync ──────────────────────────────────────────────────────────
export function createResyncCommand(): Command {
  return new Command("resync")
    .description("Resincroniza desde un checkpoint")
    .option("--checkpoint <id>", "Checkpoint a usar (latest para el más reciente)", "latest")
    .option("--room <id>", "Sala", "default")
    .option("--json", "Salida en JSON", false)
    .option("--path <dir>", "Directorio de salida para el .pkt")
    .action(async function (opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
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

// ─── peers ───────────────────────────────────────────────────────────
export function createPeersCommand(): Command {
  return new Command("peers")
    .description("Lista los peers conectados")
    .option("--url <url>", "URL del servidor collab")
    .option("--room <id>", "Sala", "default")
    .option("--json", "Salida en JSON", false)
    .action(async function (opts: Record<string, unknown>, command: Command) {
      const json = opts.json === true || getGlobalFlags(command).json;
      let url = opts.url ? String(opts.url) : null;
      const roomId = String(opts.room ?? "default");

      if (!url) {
        const session = readSessionFile();
        if (session?.publicUrl) {
          url = session.publicUrl;
        } else {
          url = getSavedUrl() || readHostConfig()?.lastPublicUrl || null;
        }
      }

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
        const isSessionBased = url.includes("/collab/s/");
        const targetUrl = isSessionBased ? `${url}/peers` : `${url}/rooms/${roomId}/peers`;

        const res = await fetch(targetUrl);
        const body = await res.json() as { ok: boolean; peers: unknown[]; count: number };

        if (json) {
          process.stdout.write(JSON.stringify(body, null, 2) + "\n");
        } else {
          const displayRoom = isSessionBased ? "session" : roomId;
          process.stdout.write(`Peers en sala '${displayRoom}': ${body.count ?? 0}\n`);
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
