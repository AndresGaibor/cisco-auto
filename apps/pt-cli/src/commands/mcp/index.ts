import { Command } from "commander";

import type { PtMcpCommandCatalogEntry } from "@cisco-auto/pt-mcp";
import { startPtMcpServer } from "@cisco-auto/pt-mcp";

export interface CreateMcpCommandOptions {
  repoRoot: string;
  cliEntrypoint: string;
  commandCatalog: PtMcpCommandCatalogEntry[];
}

export function createMcpCommand(options: CreateMcpCommandOptions): Command {
  return new Command("mcp")
    .description("Levanta servidor MCP para controlar Packet Tracer desde ChatGPT")
    .option("--host <host>", "Host local", "127.0.0.1")
    .option("--port <port>", "Puerto local", (value) => Number(value), 3927)
    .option("--path <path>", "Endpoint MCP", "/mcp")
    .option("--no-funnel", "No intentar Tailscale Funnel")
    .option("--funnel", "Forzar intento de Funnel", true)
    .option("--funnel-bg", "Levantar Funnel en background persistente", false)
    .option("--live", "Muestra requests y responses MCP en vivo", false)
    .option("--allow-origin <origin...>", "Origins permitidos")
    .option("--timeout <ms>", "Timeout por defecto para tools CLI", (value) => Number(value), 120_000)
    .option("--max-output-bytes <bytes>", "Límite de salida", (value) => Number(value), 512 * 1024)
    .option("--print-url", "Imprime URL y sale", false)
    .option("--json", "Imprime estado inicial en JSON", false)
    .action(async function (opts: Record<string, unknown>) {
      const funnel = opts.funnel !== false;
      const port = typeof opts.port === "number" ? opts.port : 3927;
      const host = typeof opts.host === "string" ? opts.host : "127.0.0.1";
      const path = typeof opts.path === "string" ? opts.path : "/mcp";
      const live = opts.live === true;
      const allowOrigins = Array.isArray(opts.allowOrigin)
        ? opts.allowOrigin.map(String)
        : undefined;

      const handle = await startPtMcpServer({
        repoRoot: options.repoRoot,
        cliEntrypoint: options.cliEntrypoint,
        port,
        host,
        path,
        commandCatalog: options.commandCatalog,
        autoFunnel: funnel,
        allowOrigins,
        live,
        stderr: process.stderr,
      });

      const lines = [
        "Packet Tracer Control MCP listo.",
        `Local: ${handle.localUrl}${path}`,
      ];

      if (handle.publicUrl) {
        lines.push(`Publico: ${handle.publicUrl}`);
      }

      process.stdout.write(`${lines.join("\n")}\n`);

      await new Promise<void>((resolve) => {
        const shutdown = async () => {
          process.off("SIGINT", shutdown);
          process.off("SIGTERM", shutdown);
          await handle.close();
          resolve();
        };

        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
      });
    });
}
