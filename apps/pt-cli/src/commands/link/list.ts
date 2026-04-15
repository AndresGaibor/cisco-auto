import { Command } from "commander";
import chalk from "chalk";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { runCommand } from "../../application/run-command.js";
import { createSuccessResult } from "../../contracts/cli-result.js";

export function createLinkListCommand(): Command {
  const cmd = new Command("list")
    .description("Listar todas las conexiones en la topología")
    .option("-d, --device <name>", "Filtrar por dispositivo")
    .option("-j, --json", "Salida en JSON")
    .action(async (options) => {
      const result = await runCommand<{
        devices: string[];
        links: Array<{
          id: string;
          device1: string;
          port1: string;
          device2: string;
          port2: string;
          cableType: string;
        }>;
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
          // Get current device list
          const { devices } = await controller.listDevices();
          const deviceNames = new Set(devices.map((d) => d.name));

          // Read links directly from PT dev directory
          const ptDevDir = process.env.PT_DEV_DIR || join(homedir(), "pt-dev");
          const linksFile = join(ptDevDir, "links.json");

          const allLinks: Array<{
            id: string;
            device1: string;
            port1: string;
            device2: string;
            port2: string;
            cableType: string;
          }> = [];

          if (existsSync(linksFile)) {
            try {
              const content = readFileSync(linksFile, "utf-8");
              const linksData = JSON.parse(content);

              for (const [id, link] of Object.entries(linksData)) {
                const d1 = (link as any).device1 || (link as any).endpointA;
                const d2 = (link as any).device2 || (link as any).endpointB;
                const p1 = (link as any).port1 || (link as any).portA || "";
                const p2 = (link as any).port2 || (link as any).portB || "";

                // Only include links where BOTH devices exist
                if (deviceNames.has(d1) && deviceNames.has(d2)) {
                  // Skip if we've already seen a connection between these same devices
                  // (regardless of port, since a device can't have multiple cables to same peer on different ports in PT typically)
                  const isDuplicate = allLinks.some(
                    (l) =>
                      (l.device1 === d1 && l.device2 === d2) ||
                      (l.device1 === d2 && l.device2 === d1),
                  );
                  if (isDuplicate) continue;

                  allLinks.push({
                    id,
                    device1: d1,
                    port1: p1,
                    device2: d2,
                    port2: p2,
                    cableType: (link as any).cableType || (link as any).linkType || "auto",
                  });
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }

          return createSuccessResult("link.list", {
            links: allLinks,
            devices: Array.from(deviceNames),
          });
        },
      });

      if (!result.ok) {
        console.error(`${chalk.red("✗")} Error: ${result.error?.message}`);
        process.exit(1);
      }

      const links = result.data?.links || [];

      if (options.json) {
        console.log(JSON.stringify(links, null, 2));
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
        console.log(`   tipo: ${link.cableType} | id: ${chalk.gray(link.id)}`);
      }

      console.log(chalk.gray("─".repeat(60)));
      console.log(`Total: ${links.length} enlace(s)`);
    });

  return cmd;
}
