import { Command } from "commander";
import { formatExamples, formatRelatedCommands } from "../../help/formatter";
import { getExamples } from "../../help/examples";
import { getRelatedCommands } from "../../help/related";
import chalk from "chalk";
import { loadLiveDeviceList } from "../../application/device-list.js";
import { getGlobalFlags } from "../../flags.js";

export function createDeviceListCommand(): Command {
  const cmd = new Command("list")
    .description("Listar dispositivos en PT (consulta directa)")
    .option("-t, --type <type>", "Filtrar por tipo (router|switch|pc|server)")
    .action(async (options, thisCmd) => {
      const deviceCmd = thisCmd.parent as Command | undefined;
      const rootCmd = deviceCmd?.parent as Command | undefined;
      const globalFlags = rootCmd ? getGlobalFlags(rootCmd) : ({ json: false } as const);
      const useJson = globalFlags.json || (options.json ?? false);

      let result;
      try {
        result = await loadLiveDeviceList(options.type);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("no respondió") || msg.includes("no conectado")) {
          console.log(chalk.red("✗ Packet Tracer no responde."));
          console.log(chalk.gray("  Verifica que PT esté abierto y ~/pt-dev/main.js cargado."));
        } else {
          console.log(chalk.red("✗ Error: " + msg));
        }
        return;
      }

      if (result.count === 0) {
        if (useJson) {
          console.log(JSON.stringify([], null, 2));
        } else {
          console.log(chalk.yellow("No se encontraron dispositivos."));
          console.log(chalk.gray("Verifica que PT esté abierto y el runtime activo."));
        }
        return;
      }

      renderDeviceList({
        devices: result.devices,
        count: result.count,
        deviceLinks: result.deviceLinks,
        useJson,
      });
    });

  const examples = getExamples("device list");
  const related = getRelatedCommands("device list");

  cmd.addHelpText("after", formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}

function renderDeviceList(options: {
  devices: Array<{
    name: string;
    model: string;
    type: string;
    power: boolean;
    ports?: Array<unknown>;
  }>;
  count: number;
  deviceLinks: Record<string, string[]>;
  useJson: boolean;
}): void {
  if (options.useJson) {
    console.log(JSON.stringify(options.devices, null, 2));
    return;
  }

  console.log(`\n📱 Dispositivos en Packet Tracer (${options.count}):`);
  console.log("━".repeat(60));

  const TYPE_NAMES: Record<string | number, string> = {
    pc: "PC",
    8: "PC",
    switch: "Switch",
    1: "Switch",
    "switch-l2": "Switch-L2",
    switch_layer3: "Switch-L3",
    16: "Switch-L3",
    router: "Router",
    0: "Router",
    server: "Server",
  };

  const getTypeName = (t: string | number) => TYPE_NAMES[t] || String(t);

  options.devices.forEach((device, i) => {
    const typeName = getTypeName(device.type);

    const ports = (device as any).ports || [];
    const ip =
      (device as any)?.ip ||
      ports?.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.ipAddress;
    const mask =
      (device as any)?.mask ||
      ports?.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.subnetMask;

    const links = options.deviceLinks[device.name] || [];

    console.log(`\n${i + 1}. ${chalk.cyan(device.name)}`);

    if (ip && ip !== "0.0.0.0") {
      console.log(`   ${chalk.green("●")} ${ip}/${mask || "?"}`);
    }

    console.log(`   ${typeName} | ${device.model} | ${links.length} enlace(s)`);

    if (links.length > 0) {
      console.log(`   → ${chalk.gray(links.join(", "))}`);
    }
  });

  const totalLinks =
    Object.keys(options.deviceLinks).reduce(
      (sum, key) => sum + (options.deviceLinks[key]?.length || 0),
      0,
    ) / 2;
  console.log(`\n${chalk.gray("─".repeat(60))}`);
  console.log(`Total: ${options.devices.length} dispositivos, ${Math.round(totalLinks)} enlaces`);
}
