import { Command } from "commander";
import chalk from "chalk";
import { runCommand } from "../../application/run-command.js";
import { createSuccessResult } from "../../contracts/cli-result.js";
import { loadLiveDeviceList, type ConnectionInfo } from "../../application/device-list.js";

export interface ListedLink {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  source: string;
}

function buildCanonicalLinkId(
  device1: string,
  port1: string,
  device2: string,
  port2: string,
): string {
  const normalized = [device1, port1, device2, port2].sort().join("|");
  return Buffer.from(normalized).toString("base64").slice(0, 16);
}

function extractUniqueLinks(connectionsByDevice: Record<string, ConnectionInfo[]>): ListedLink[] {
  const seen = new Set<string>();
  const links: ListedLink[] = [];

  for (const [localDevice, connections] of Object.entries(connectionsByDevice)) {
    for (const conn of connections) {
      if (!conn.remoteDevice || !conn.localPort) continue;

      const id = buildCanonicalLinkId(
        localDevice,
        conn.localPort,
        conn.remoteDevice,
        conn.remotePort || "",
      );
      if (seen.has(id)) continue;
      seen.add(id);

      links.push({
        id,
        device1: localDevice,
        port1: conn.localPort,
        device2: conn.remoteDevice,
        port2: conn.remotePort || "",
        source: conn.confidence,
      });
    }
  }

  return links;
}

export function createLinkListCommand(): Command {
  const cmd = new Command("list")
    .description("Listar todas las conexiones en la topología")
    .option("-d, --device <name>", "Filtrar por dispositivo")
    .option("-j, --json", "Salida en JSON")
    .action(async (options) => {
      const result = await runCommand<{
        devices: string[];
        links: ListedLink[];
      }>({
        action: "link.list",
        meta: { id: "link.list", summary: "Listar conexiones", examples: [], related: [] },
        flags: {
          json: Boolean(options.json),
          jq: null,
          output: "table",
          verbose: false,
          quiet: false,
          trace: false,
          tracePayload: false,
          traceResult: false,
          traceDir: null,
          traceBundle: false,
          traceBundlePath: null,
          sessionId: null,
          examples: false,
          schema: false,
          explain: false,
          plan: false,
          verify: false,
        },
        execute: async ({ controller }) => {
          const { devices, connectionsByDevice } = await loadLiveDeviceList();

          const deviceNames = new Set(devices.map((d) => d.name));

          const links = extractUniqueLinks(connectionsByDevice).filter(
            (link) => deviceNames.has(link.device1) && deviceNames.has(link.device2),
          );

          return createSuccessResult("link.list", {
            links,
            devices: Array.from(deviceNames),
          });
        },
      });

      if (!result.ok) {
        console.error(`${chalk.red("✗")} Error: ${result.error?.message}`);
        process.exit(1);
      }

      const links: ListedLink[] = result.data?.links || [];

      if (options.json) {
        console.log(JSON.stringify({ links, stats: { linkCount: links.length } }, null, 2));
        return;
      }

      if (links.length === 0) {
        console.log(`\n${chalk.bold("Conexiones en la topología:")} ${chalk.gray("(vacía)")}`);
        console.log(chalk.gray("  No hay enlaces configurados"));
        return;
      }

      console.log(`\n${chalk.bold("Conexiones en la topología:")}`);
      console.log(chalk.gray("─".repeat(60)));

      for (const link of links) {
        const filter = options.device;
        if (filter && filter !== link.device1 && filter !== link.device2) {
          continue;
        }

        console.log(
          `${chalk.cyan(link.device1)}:${link.port1} ${chalk.gray("↔")} ${chalk.cyan(link.device2)}:${link.port2}`,
        );
        console.log(`   source: ${link.source} | id: ${chalk.gray(link.id)}`);
      }

      console.log(chalk.gray("─".repeat(60)));
      console.log(`Total: ${links.length} enlace(s)`);
    });

  return cmd;
}
