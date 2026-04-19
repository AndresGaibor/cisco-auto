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
          console.log(
            chalk.gray("  Verifica que PT esté abierto y el script generado esté cargado."),
          );
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
          console.log(chalk.gray("Verifica que PT esté abierto y el runtime esté activo."));
        }
        return;
      }

      log("rendering", { count: result.count, verbose, linksMode });

      renderDeviceList({
        devices: result.devices,
        count: result.count,
        connectionsByDevice: result.connectionsByDevice,
        unresolvedLinks: result.unresolvedLinks,
        ptLinkDebug: (result as any).ptLinkDebug,
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
  mac?: string;
  speed?: string;
  duplex?: "auto" | "full" | "half";
  vlan?: number;
  mode?: "unknown" | "trunk" | "access" | "dynamic";
  link?: string;
  connection?: PortConnection;
}

export function selectPortsForDisplay(ports: ListedPort[], verbose: boolean): ListedPort[] {
  if (verbose) return ports;

  const MAX_PORTS = 8;

  const scorePort = (port: ListedPort): number => {
    let score = 0;
    if (port.link || port.connection) score += 100;
    if ((port as any).linkedPortName) score += 80;
    if (port.status === "up" || port.protocol === "up") score += 40;
    if (port.ipAddress && port.ipAddress !== "0.0.0.0") score += 20;
    if (port.macAddress || port.mac) score += 10;
    return score;
  };

  return ports
    .filter((port) => scorePort(port) > 0)
    .sort((a, b) => scorePort(b) - scorePort(a))
    .slice(0, MAX_PORTS);
}

export function extractDeviceMac(ports: ListedPort[]): string | undefined {
  return ports
    .map((port) => port.macAddress || port.mac)
    .find((mac) => mac && mac !== "0.0.0.0" && mac !== "0000.0000.0000");
}

export function getPortLinkLabel(port: ListedPort): string {
  if (port.connection?.remoteDevice && port.connection?.remotePort) {
    return `${port.connection.remoteDevice}:${port.connection.remotePort}`;
  }

  const isUp =
    (typeof (port as { up?: boolean }).up === "boolean" && (port as { up?: boolean }).up) ||
    port.status === "up" ||
    port.protocol === "up";

  if (isUp) return "UP";
  if (port.status === "administratively down") return "ADMIN-DOWN";
  if (port.status === "down" || port.protocol === "down") return "DOWN";
  return "--";
}

interface RenderDevice {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports?: ListedPort[];
  mac?: string;
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
  ptLinkDebug?: {
    getLinkCountResult: number;
    ptLinksFromLinkAt?: number;
    ptLinksFromPortScan?: number;
    ptLinksFound: number;
    registryEntries: number;
  };
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
  const deviceMap = new Map(devices.map((device) => [device.name, device] as const));
  const pad = (value: string, width: number) => value.padEnd(width, " ");

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

    devices.forEach((device, i) => {
      const typeName = getTypeName(device.type);
      const ports = device.ports || [];
      const deviceMac = device.mac || extractDeviceMac(ports);
      const ip =
        device.ip || ports?.find((p) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.ipAddress;
      const mask =
        device.mask || ports?.find((p) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.subnetMask;
      const hostname = device.hostname || device.name;

      console.log(`\n${i + 1}. ${chalk.cyan(device.name)}`);
      console.log(`   ${chalk.gray("Device Name")}: ${device.name}`);
      console.log(`   ${chalk.gray("Custom Device Model")}: ${device.model}`);
      console.log(`   ${chalk.gray("Hostname")}: ${hostname}`);

      if (ip && ip !== "0.0.0.0") {
        console.log(`   ${chalk.green("●")} ${ip}/${mask || "?"}`);
      }

      console.log(
        `   ${pad(chalk.gray("Port"), 22)}${pad(chalk.gray("Link"), 20)}${pad(chalk.gray("VLAN"), 6)}${pad(chalk.gray("IP Address"), 18)}${chalk.gray("MAC Address")}`,
      );

      ports.forEach((p) => {
        const rawLabel = getPortLinkLabel(p);
        const linkedPortName = (p as any).linkedPortName as string | undefined;
        let linkValue: string;
        if (p.connection) {
          linkValue = chalk.green(rawLabel);
        } else if (rawLabel === "--" && linkedPortName) {
          linkValue = chalk.yellow(linkedPortName);
        } else if (rawLabel === "ADMIN-DOWN") {
          linkValue = chalk.yellow(rawLabel);
        } else if (rawLabel === "DOWN") {
          linkValue = chalk.red(rawLabel);
        } else if (rawLabel === "UP") {
          linkValue = chalk.green(rawLabel);
        } else {
          linkValue = chalk.gray(rawLabel);
        }
        const vlanValue = p.vlan !== null && p.vlan !== undefined ? String(p.vlan) : "--";
        // FIX: Prioritize ipAddress from our new collector
        const ipValue = (p.ipAddress && p.ipAddress !== "0.0.0.0") ? p.ipAddress : "--";
        const macValue = (p.macAddress && p.macAddress !== "") ? p.macAddress : (p.mac || "--");
        
        const portCol = pad(p.name, 22);
        const linkCol = pad(linkValue, 28); // Increased for ANSI colors
        const vlanCol = pad(vlanValue, 6);
        const ipCol = pad(ipValue, 18);
        console.log(`      ${portCol}${linkCol}${vlanCol}${ipCol}${macValue}`);
      });
    });
  }

  console.log(`\n${chalk.gray("─".repeat(60))}`);
  console.log(`Total: ${devices.length} dispositivos`);

  // Mostrar diagnóstico de link discovery en --verbose
  if (options.verbose && options.ptLinkDebug) {
    const d = options.ptLinkDebug;
    const parts = [
      `getLinkAt=${d.getLinkCountResult}`,
      `linkAt=${d.ptLinksFromLinkAt ?? "?"}`,
      `portScan=${d.ptLinksFromPortScan ?? "?"}`,
      `total=${d.ptLinksFound}`,
      `registry=${d.registryEntries}`,
    ];
    console.log(chalk.gray(`\n[debug:links] ${parts.join("  ")}`));
    if ((d.ptLinksFromPortScan ?? 0) === 0 && d.ptLinksFound <= 1) {
      console.log(
        chalk.yellow(
          "  ⚠ port.getLink() retornó null para todos los puertos UP.\n" +
            "  El .pkt puede requerir Estrategia B (CDP CLI). Ver implementación_plan.md",
        ),
      );
    }
  }
}
