import { type CollabClientOptions, CollabClient } from "@cisco-auto/pt-collab";
import chalk from "chalk";

const GIT_UPDATE_EXIT_CODE = 31;

export async function checkForGitUpdates(json: boolean): Promise<boolean> {
  try {
    const { execSync } = await import("node:child_process");

    execSync("git fetch --tags", { stdio: "pipe" });

    const localSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    const remoteSha = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim();

    if (localSha === remoteSha) {
      return false;
    }

    const ahead = Number(
      execSync(`git rev-list --left-right --count ${localSha}...${remoteSha}`, { encoding: "utf8" }).trim().split("\t")[1] ?? "0",
    );

    if (ahead > 0) {
      if (json) {
        process.stdout.write(
          JSON.stringify({
            ok: false,
            error: "git_updates_available",
            message: `Hay ${ahead} actualización${ahead === 1 ? "" : "es"} disponible${ahead === 1 ? "" : "s"} en origin/main. Ejecuta 'git pull' antes de continuar.`,
            localSha,
            remoteSha,
          }) + "\n",
        );
      } else {
        process.stderr.write(
          `${chalk.yellow("⚠  Hay actualizaciones disponibles en origin/main.")}\n` +
            `   Ejecuta: ${chalk.cyan("git pull")}\n` +
            `   Luego vuelve a ejecutar este comando.\n`,
        );
      }
      process.exit(GIT_UPDATE_EXIT_CODE);
    }

    return false;
  } catch {
    return false;
  }
}

export function connectWithTimeout(opts: CollabClientOptions & { timeoutMs?: number }): Promise<CollabClient> {
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

export function setupRealtimeLogging(client: any) {
  if (!client) return;

  const prefix = chalk.blue("[Sync]");
  const timestamp = () => chalk.gray(new Date().toISOString());

  // 1. Connection / status events
  client.on("welcome", (msg: any) => {
    process.stdout.write(`${timestamp()} ${prefix} Conexión establecida. Sala: ${chalk.green(msg.roomId)} · Tu ID: ${chalk.green(client.peerId)}\n`);
  });

  client.on("status.change", (status: string) => {
    if (status === "reconnecting") {
      process.stdout.write(`${timestamp()} ${prefix} ${chalk.yellow("Conexión perdida, reconectando...")}\n`);
    } else if (status === "connected") {
      process.stdout.write(`${timestamp()} ${prefix} ${chalk.green("Reconectado exitosamente")}\n`);
    } else if (status === "disconnected") {
      process.stdout.write(`${timestamp()} ${prefix} ${chalk.red("Desconectado")}\n`);
    }
  });

  client.on("peer.joined", (msg: any) => {
    process.stdout.write(`${timestamp()} ${prefix} Colaborador conectado: ${chalk.cyan(msg.peer.displayName ?? msg.peer.peerId)} (${msg.peer.peerId})\n`);
  });

  client.on("peer.left", (msg: any) => {
    process.stdout.write(`${timestamp()} ${prefix} Colaborador desconectado: ${chalk.yellow(msg.peerId)}\n`);
  });

  // 2. Delta (change) events
  client.on("delta.commit", (msg: any) => {
    const delta = msg.delta;
    process.stdout.write(`${timestamp()} ${prefix} Recibido cambio remoto de ${chalk.cyan(delta.peerId)}: ${chalk.magenta(delta.kind)} en ${chalk.gray(delta.scope)}${formatDeltaCommands(delta)}\n`);
  });

  client.on("delta.ack", (msg: any) => {
    if (msg.accepted) {
      process.stdout.write(`${timestamp()} ${prefix} Cambio local aceptado y guardado en servidor\n`);
    } else {
      process.stdout.write(`${timestamp()} ${prefix} Cambio local rechazado por el servidor. Razón: ${chalk.red(msg.reason ?? "desconocida")}\n`);
    }
  });

  // 3. Error and Conflict events
  client.on("error", (msg: any) => {
    process.stderr.write(`${timestamp()} ${prefix} ${chalk.red("Error")}: [${msg.code}] ${msg.message}\n`);
  });

  client.on("conflict.created", (msg: any) => {
    process.stdout.write(`${timestamp()} ${prefix} ${chalk.yellow("Conflicto detectado")} en ${msg.conflict.scope}. ID: ${msg.conflict.id}\n`);
  });

  client.on("conflict.resolved", (msg: any) => {
    process.stdout.write(`${timestamp()} ${prefix} Conflicto ${msg.conflictId} resuelto mediante resolución: ${chalk.green(msg.resolution)}\n`);
  });

  // 4. Wrap outgoing sendMessage to track outgoing submits
  const originalSend = client.sendMessage.bind(client);
  client.sendMessage = (msg: any) => {
    if (msg.type === "delta.submit") {
      const delta = msg.delta;
      process.stdout.write(`${timestamp()} ${prefix} Enviando cambio local: ${chalk.magenta(delta.kind)} en ${chalk.gray(delta.scope)}${formatDeltaCommands(delta)}\n`);
    }
    originalSend(msg);
  };
}

export function formatDeltaCommands(delta: any): string {
  const payload = delta?.payload;
  const configLines = Array.isArray(payload?.configLines)
    ? payload.configLines.filter((line: unknown) => typeof line === "string")
    : [];

  if (configLines.length === 0) return "";
  return ` comandos=${chalk.cyan(JSON.stringify(configLines))}`;
}
