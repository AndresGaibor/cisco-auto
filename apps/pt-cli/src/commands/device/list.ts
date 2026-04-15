import { Command } from "commander";
import { formatExamples, formatRelatedCommands } from "../../help/formatter";
import { getExamples } from "../../help/examples";
import { getRelatedCommands } from "../../help/related";
import chalk from "chalk";
import { loadLiveDeviceList, type ConnectionInfo } from "../../application/device-list.js";
import { getGlobalFlags } from "../../flags.js";

export function createDeviceListCommand(): Command {
  const cmd = new Command("list")
    .description("Listar dispositivos en PT (consulta directa)")
    .option("-t, --type <type>", "Filtrar por tipo (router|switch|pc|server)")
    .option("--refresh", "Forzar actualización del cache de puertos (TTL: 5 min)")
    .action(async (options, thisCmd) => {
      const deviceCmd = thisCmd.parent as Command | undefined;
      const rootCmd = deviceCmd?.parent as Command | undefined;
      const globalFlags = rootCmd ? getGlobalFlags(rootCmd) : ({ json: false } as const);
      const useJson = globalFlags.json || (options.json ?? false);

      let result;
      try {
        result = await loadLiveDeviceList(options.type, { refreshCache: options.refresh });
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
        connectionsByDevice: result.connectionsByDevice,
        unresolvedLinks: result.unresolvedLinks,
        useJson,
      });
    });

  const examples = getExamples("device list");
  const related = getRelatedCommands("device list");

  cmd.addHelpText("after", formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}

interface UnresolvedLink {
  port1Name: string;
  port2Name: string;
  candidates1: string[];
  candidates2: string[];
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
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: UnresolvedLink[];
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

  const confidenceBadge = (confidence: ConnectionInfo["confidence"]) => {
    switch (confidence) {
      case "exact":
        return chalk.green("[exact]");
      case "registry":
        return chalk.green("[exact]");
      case "ambiguous":
        return chalk.yellow("[ambiguous]");
      case "unknown":
        return chalk.gray("[?]");
      default:
        return chalk.gray("[?]");
    }
  };

  options.devices.forEach((device, i) => {
    const typeName = getTypeName(device.type);

    const ports = (device as any).ports || [];
    const ip =
      (device as any)?.ip ||
      ports?.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.ipAddress;
    const mask =
      (device as any)?.mask ||
      ports?.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.subnetMask;

    const connections = options.connectionsByDevice[device.name] || [];

    console.log(`\n${i + 1}. ${chalk.cyan(device.name)}`);

    if (ip && ip !== "0.0.0.0") {
      console.log(`   ${chalk.green("●")} ${ip}/${mask || "?"}`);
    }

    console.log(`   ${typeName} | ${device.model} | ${connections.length} enlace(s)`);

    if (connections.length > 0) {
      connections.forEach((conn) => {
        console.log(
          `   - ${conn.localPort} ↔ ${conn.remoteDevice}:${conn.remotePort} ${confidenceBadge(conn.confidence)}`,
        );
      });
    }

    if (connections.length === 0) {
      const unresolvedForDevice = options.unresolvedLinks.filter(
        (ul) => ul.candidates1.includes(device.name) || ul.candidates2.includes(device.name),
      );
      if (unresolvedForDevice.length > 0) {
        console.log(
          `   ${chalk.gray("(?) Puertos no resueltos: " + unresolvedForDevice.map((ul) => ul.port1Name + "/" + ul.port2Name).join(", "))}`,
        );
      }
    }

    // Puerto details (solo los interesantes: tienen IP o están up)
    const interestingPorts = ports.filter((p: any) => p.hasIp || p.up === true).slice(0, 12);
    if (interestingPorts.length > 0) {
      console.log(`   ${chalk.gray("Puertos:")}`);
      interestingPorts.forEach((p: any) => {
        const vlanStr = p.vlan !== null ? `VLAN:${p.vlan}` : "";
        const ipStr = p.hasIp ? `${p.ip}` : "";
        const statusStr =
          p.up === true ? chalk.green("UP") : p.up === false ? chalk.red("DOWN") : "";
        const macStr = p.mac ? `MAC:${p.mac}` : "";
        const parts = [p.name, ipStr, vlanStr, macStr, statusStr].filter(Boolean).join(" | ");
        console.log(`      ${parts}`);
      });
      if (ports.length > interestingPorts.length) {
        console.log(
          `      ${chalk.gray(`+${ports.length - interestingPorts.length} puertos más`)}`,
        );
      }
    }
  });

  const totalLinks = Object.values(options.connectionsByDevice).reduce(
    (sum, conns) => sum + conns.length,
    0,
  );
  console.log(`\n${chalk.gray("─".repeat(60))}`);
  console.log(`Total: ${options.devices.length} dispositivos, ${totalLinks} enlaces`);
}
