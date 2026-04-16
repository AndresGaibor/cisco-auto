import { Command } from "commander";
import { formatExamples, formatRelatedCommands } from "../../help/formatter";
import { getExamples } from "../../help/examples";
import { getRelatedCommands } from "../../help/related";
import chalk from "chalk";
import {
  loadLiveDeviceList,
  type ConnectionInfo,
  type PortConnection,
} from "../../application/device-list.js";
import { getGlobalFlags } from "../../flags.js";

const DEBUG = process.env.PT_DEBUG === "1";

const log = (...args: unknown[]) => {
  if (DEBUG) console.log("[device-list]", ...args);
};

export function createDeviceListCommand(): Command {
  const cmd = new Command("list")
    .description("Listar dispositivos en PT (consulta directa)")
    .option("-t, --type <type>", "Filtrar por tipo (router|switch|pc|server)")
    .option("--refresh", "Forzar actualización del cache de puertos (TTL: 5 min)")
    .option("--verbose", "Mostrar todos los puertos y enlaces, sin límite")
    .option("--links", "Vista enfocada en conectividad (todos los peers)")
    .action(async (options, thisCmd) => {
      const deviceCmd = thisCmd.parent as Command | undefined;
      const rootCmd = deviceCmd?.parent as Command | undefined;
      const globalFlags = rootCmd ? getGlobalFlags(rootCmd) : ({ json: false } as const);
      const useJson = globalFlags.json || (options.json ?? false);
      const verbose = options.verbose ?? false;
      const linksMode = options.links ?? false;

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

      log("rendering", { count: result.count, verbose, linksMode });

      renderDeviceList({
        devices: result.devices,
        count: result.count,
        connectionsByDevice: result.connectionsByDevice,
        unresolvedLinks: result.unresolvedLinks,
        useJson,
        verbose,
        linksMode,
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
  confidence: ConnectionInfo["confidence"];
  evidence: string[];
}

interface ListedPort {
  name: string;
  type?: string;
  status?: "up" | "down" | "administratively down";
  protocol?: "up" | "down";
  ipAddress?: string;
  subnetMask?: string;
  macAddress?: string;
  speed?: string;
  duplex?: "auto" | "full" | "half";
  vlan?: number;
  mode?: "unknown" | "trunk" | "access" | "dynamic";
  link?: string;
  connection?: PortConnection;
}

interface RenderDevice {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports?: ListedPort[];
  displayName?: string;
  x?: number;
  y?: number;
  hostname?: string;
  ip?: string;
  mask?: string;
}

interface RenderOptions {
  devices: RenderDevice[];
  count: number;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: UnresolvedLink[];
  useJson: boolean;
  verbose: boolean;
  linksMode: boolean;
}

function renderDeviceList(options: RenderOptions): void {
  if (options.useJson) {
    const allLinks = Object.values(options.connectionsByDevice).flat();
    const totalLinks = allLinks.length;
    const exactLinks = allLinks.filter((c) => c.confidence === "exact").length;
    const mergedLinks = allLinks.filter((c) => c.confidence === "merged").length;
    const registryLinks = allLinks.filter((c) => c.confidence === "registry").length;
    const ambiguousLinks = allLinks.filter((c) => c.confidence === "ambiguous").length;
    const unresolvedCount = options.unresolvedLinks.length;

    console.log(
      JSON.stringify(
        {
          devices: options.devices,
          links: [],
          connectionsByDevice: options.connectionsByDevice,
          unresolvedLinks: options.unresolvedLinks,
          stats: {
            deviceCount: options.devices.length,
            linkCount: totalLinks,
            exactCount: exactLinks,
            registryCount: registryLinks,
            mergedCount: mergedLinks,
            ambiguousCount: ambiguousLinks,
            unresolvedCount,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

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
      case "merged":
        return chalk.green("[verified]");
      case "registry":
        return chalk.green("[registry]");
      case "ambiguous":
        return chalk.yellow("[ambiguous]");
      case "unknown":
        return chalk.gray("[unknown]");
      default:
        return chalk.gray("[?]");
    }
  };

  const devices = options.devices;

  if (options.linksMode) {
    console.log(`\n📡 Conectividad (${devices.length} dispositivos):`);
    console.log("━".repeat(60));

    devices.forEach((device, i) => {
      const typeName = getTypeName(device.type);
      const connections = options.connectionsByDevice[device.name] || [];

      console.log(`\n${i + 1}. ${chalk.cyan(device.name)} (${typeName})`);

      if (connections.length === 0) {
        console.log(`   ${chalk.gray("Sin enlaces")}`);
      } else {
        connections.forEach((conn) => {
          const peer = conn.remoteDevice ?? chalk.gray("?");
          const port = conn.remotePort ?? chalk.gray("?");
          const local = conn.localPort ?? chalk.gray("?");
          console.log(`   ${local} ↔ ${peer}:${port} ${confidenceBadge(conn.confidence)}`);
        });
      }

      if (options.verbose) {
        const unresolvedForDevice = options.unresolvedLinks.filter(
          (ul) => ul.candidates1.includes(device.name) || ul.candidates2.includes(device.name),
        );
        if (unresolvedForDevice.length > 0) {
          console.log(`   ${chalk.yellow("(?) Unresolved:")}`);
          unresolvedForDevice.forEach((ul) => {
            console.log(`      ${ul.port1Name} ↔ ${ul.port2Name}`);
            if (ul.candidates1.length > 1 || ul.candidates2.length > 1) {
              const c1 = ul.candidates1.filter((c) => c !== device.name);
              const c2 = ul.candidates2.filter((c) => c !== device.name);
              if (c1.length > 0) console.log(`         candidates1: ${c1.join(", ")}`);
              if (c2.length > 0) console.log(`         candidates2: ${c2.join(", ")}`);
            }
          });
        }
      }
    });
  } else {
    console.log(`\n📱 Dispositivos en Packet Tracer (${devices.length}):`);
    console.log("━".repeat(60));

    const maxPorts = options.verbose ? Infinity : 8;

    devices.forEach((device, i) => {
      const typeName = getTypeName(device.type);
      const ports = device.ports || [];
      const ip =
        device.ip || ports?.find((p) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.ipAddress;
      const mask =
        device.mask || ports?.find((p) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.subnetMask;

      console.log(`\n${i + 1}. ${chalk.cyan(device.name)}`);

      if (ip && ip !== "0.0.0.0") {
        console.log(`   ${chalk.green("●")} ${ip}/${mask || "?"}`);
      }

      console.log(`   ${typeName} | ${device.model}`);

      const interestingPorts = ports.filter(
        (p) => p.ipAddress || p.status === "up" || p.connection,
      );
      const portsToShow = interestingPorts.slice(0, maxPorts);

      if (portsToShow.length > 0) {
        console.log(`   ${chalk.gray("Puertos:")}`);
        portsToShow.forEach((p) => {
          const vlanStr = p.vlan !== null && p.vlan !== undefined ? `VLAN:${p.vlan}` : "";
          const ipStr = p.ipAddress ? `${p.ipAddress}` : "";
          const statusStr =
            p.status === "up"
              ? chalk.green("UP")
              : p.status === "down"
                ? chalk.red("DOWN")
                : p.status === "administratively down"
                  ? chalk.yellow("ADMIN-DOWN")
                  : "";
          const macStr = p.macAddress ? `MAC:${p.macAddress}` : "";
          const parts = [p.name, ipStr, vlanStr, macStr, statusStr].filter(Boolean).join(" | ");
          if (p.connection) {
            const peer = p.connection.remoteDevice;
            const remote = p.connection.remotePort;
            const connBadge = confidenceBadge(p.connection.confidence);
            console.log(`      ${parts} → ${chalk.cyan(peer)}:${remote} ${connBadge}`);
          } else {
            console.log(`      ${parts}`);
          }
        });
        if (interestingPorts.length > maxPorts && !options.verbose) {
          console.log(`      ${chalk.gray(`+${interestingPorts.length - maxPorts} más`)}`);
        }
      }
    });
  }

  const allLinks = Object.values(options.connectionsByDevice).flat();
  const totalLinks = allLinks.length;
  const exactLinks = allLinks.filter((c) => c.confidence === "exact").length;
  const mergedLinks = allLinks.filter((c) => c.confidence === "merged").length;
  const registryLinks = allLinks.filter((c) => c.confidence === "registry").length;
  const unresolvedCount = options.unresolvedLinks.length;

  console.log(`\n${chalk.gray("─".repeat(60))}`);
  console.log(`Total: ${devices.length} dispositivos`);
  console.log(`Directos: ${exactLinks + mergedLinks + registryLinks}`);
  if (unresolvedCount > 0) {
    console.log(`\n${chalk.yellow("Sin resolver")} (${unresolvedCount}):`);
    options.unresolvedLinks.forEach((ul) => {
      const candidatesStr1 = ul.candidates1.length > 0 ? ` [${ul.candidates1.join(", ")}]` : "";
      const candidatesStr2 = ul.candidates2.length > 0 ? ` [${ul.candidates2.join(", ")}]` : "";
      console.log(
        `   ${ul.port1Name}${candidatesStr1} ↔ ${ul.port2Name}${candidatesStr2} ${confidenceBadge(ul.confidence)}`,
      );
    });
  }
}
