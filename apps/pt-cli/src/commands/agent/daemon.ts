#!/usr/bin/env bun
import { Command } from "commander";
import { createDaemonService, type DaemonService } from "@cisco-auto/pt-control/agent";

const DEFAULT_OPENCODE_PORT = 4099;
const DEFAULT_POLL_INTERVAL_MS = 2000;

function getDaemonConfig() {
  return {
    devDir: process.env.PT_DEV_DIR || process.env.HOME + "/pt-dev",
    pollIntervalMs: Number(process.env.AGENT_POLL_INTERVAL) || DEFAULT_POLL_INTERVAL_MS,
    opencode: {
      port: Number(process.env.OPENCODE_SERVER_PORT) || DEFAULT_OPENCODE_PORT,
      binaryPath: process.env.OPENCODE_BIN || "",
      projectDir: process.env.OPENCODE_PROJECT_DIR || process.cwd(),
      pure: process.env.OPENCODE_PURE !== "false",
    },
  };
}

let daemon: DaemonService | null = null;

function getDaemon(): DaemonService {
  if (!daemon) {
    daemon = createDaemonService(getDaemonConfig());
  }
  return daemon;
}

export function createAgentDaemonCommand(): Command {
  const cmd = new Command("daemon")
    .description("Puentea consultas @agent desde notas del canvas hacia OpenCode AI");

  cmd
    .command("start")
    .description("Iniciar el daemon agent con servidor OpenCode")
    .option("--dev-dir <path>", "Directorio de desarrollo PT")
    .option("--poll-interval <ms>", "Intervalo de polling en ms")
    .option("--opencode-port <port>", "Puerto para servidor OpenCode")
    .option("--no-pure", "Ejecutar servidor OpenCode con plugins")
    .action(async function (options: {
      devDir?: string;
      pollInterval?: string;
      opencodePort?: string;
      pure?: boolean;
    }) {
      const instance = createDaemonService({
        ...getDaemonConfig(),
        ...(options.devDir ? { devDir: options.devDir } : {}),
        ...(options.pollInterval ? { pollIntervalMs: Number(options.pollInterval) } : {}),
        opencode: {
          ...(options.opencodePort ? { port: Number(options.opencodePort) } : {}),
          ...(options.pure !== undefined ? { pure: options.pure } : {}),
        },
      });

      daemon = instance;
      await instance.start();

      // Give it a moment to detect issues
      await new Promise((r) => setTimeout(r, 1000));

      if (!instance.isRunning()) {
        console.error("No se pudo iniciar el daemon.");
        process.exit(1);
      }

      console.log("Daemon agent iniciado con OpenCode. Presiona Ctrl+C para detener.");
      console.log("Monitorizando:", (instance.getStatus().config as Record<string, unknown>));

      process.on("SIGINT", () => {
        instance.stop();
        process.exit(0);
      });

      process.on("SIGTERM", () => {
        instance.stop();
        process.exit(0);
      });

      // Keep alive
      await new Promise(() => {});
    });

  cmd
    .command("stop")
    .description("Detener el daemon agent")
    .action(() => {
      if (daemon?.isRunning()) {
        daemon.stop();
        console.log("Daemon detenido.");
      } else {
        console.log("El daemon no está corriendo.");
      }
    });

  cmd
    .command("status")
    .description("Mostrar estado del daemon agent")
    .option("--json", "Salida en JSON", false)
    .action((options: { json: boolean }) => {
      const status = getDaemon().getStatus();

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      console.log("Estado del Daemon Agent:");
      console.log("  Running:             " + (status.running ? "Sí" : "No"));
      console.log("  Directorio:          " + status.config.devDir);
      console.log("  Intervalo:           " + status.config.pollIntervalMs + "ms");
      console.log("  OpenCode server:");
      console.log("    Puerto:            " + status.config.opencodePort);
      console.log("    Saludable:         " + (status.config.opencodeHealthy ? "Sí" : "No"));
      console.log("    Corriendo:         " + (status.config.opencodeRunning ? "Sí" : "No"));
      console.log("    Sesión ID:         " + (status.config.opencodeSessionId ?? "—"));
      console.log("  Polls:               " + status.pollCount);
      console.log("  Consultas:           " + status.queriesProcessed);
      console.log("  Errores:             " + status.errors);
      console.log("  Último poll:         " + (status.lastPollAt ? new Date(status.lastPollAt).toISOString() : "Nunca"));
    });

  return cmd;
}
