import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "../../application/controller-provider.js";

export function createLinkListCommand(): Command {
  return new Command("list")
    .description("Listar enlaces live en Packet Tracer")
    .option("--device <name>", "Filtrar por dispositivo")
    .option("--up", "Solo enlaces up/green", false)
    .option("--down", "Solo enlaces down/amber", false)
    .option("--json", "Salida en JSON", false)
    .action(async (options) => {
      const controller = createDefaultPTController();
      await controller.start();
      try {
        const snapshot = await controller.snapshot();
        const all = Object.values(snapshot?.links ?? {}) as any[];
        const links = all.filter((link) => {
          if (options.device && link.device1 !== options.device && link.device2 !== options.device) return false;
          if (options.up && link.state !== "green") return false;
          if (options.down && link.state === "green") return false;
          return true;
        });

        const stats = {
          linkCount: links.length,
          green: links.filter((link) => link.state === "green").length,
          amber: links.filter((link) => link.state === "amber").length,
          down: links.filter((link) => link.state === "down").length,
          unknown: links.filter((link) => link.state === "unknown").length,
        };

        if (options.json) {
          console.log(JSON.stringify({ source: "packet-tracer-live", stats, links }, null, 2));
          return;
        }

        console.log(chalk.bold("\nConexiones live en Packet Tracer\n"));
        for (const link of links) {
          const color = link.state === "green" ? chalk.green("🟢") : link.state === "amber" ? chalk.yellow("🟠") : chalk.red("🔴");
          console.log(`${color} ${link.device1}:${link.port1} ↔ ${link.device2}:${link.port2}  ${link.cableType ?? "auto"}`);
        }
        console.log(`\nTotal: ${links.length} enlace(s)`);
        console.log("Fuente: Packet Tracer live");
      } finally {
        await controller.stop();
      }
    });
}
