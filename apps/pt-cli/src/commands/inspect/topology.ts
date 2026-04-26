#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController, type PTController } from "@cisco-auto/pt-control/controller";

export interface TopologyInspectionResult {
  deviceCount: number;
  linkCount: number;
  filteredDevice?: string;
  devices: Array<{ name: string; model: string; type: string; status: string }>;
  links: Array<{ device1: string; port1: string; device2: string; port2: string }>;
}

function asArray<T>(value: Record<string, T> | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function extractDeviceName(device: any): string {
  return device?.name || device?.id || "unknown";
}

function extractLinkEndpoints(link: any): {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
} {
  return {
    device1:
      link?.device1 || link?.sourceDeviceId || link?.source?.deviceId || link?.source || "unknown",
    port1: link?.port1 || link?.sourcePort || link?.source?.port || "",
    device2:
      link?.device2 || link?.targetDeviceId || link?.target?.deviceId || link?.target || "unknown",
    port2: link?.port2 || link?.targetPort || link?.target?.port || "",
  };
}

export async function inspectTopologySnapshot(
  controller: PTController,
  filteredDevice?: string,
): Promise<TopologyInspectionResult> {
  const snapshot = await controller.snapshot();
  const devices = asArray(snapshot.devices).map((device: any) => ({
    name: extractDeviceName(device),
    model: String(device?.model || device?.type || "unknown"),
    type: String(device?.type || device?.family || "unknown"),
    status: String(device?.state || device?.status || "unknown"),
  }));

  const links = asArray(snapshot.links).map((link: any) => extractLinkEndpoints(link));
  const filteredDevices = filteredDevice
    ? devices.filter((device) => device.name === filteredDevice)
    : devices;
  const filteredLinks = filteredDevice
    ? links.filter((link) => link.device1 === filteredDevice || link.device2 === filteredDevice)
    : links;

  return {
    deviceCount: filteredDevices.length,
    linkCount: filteredLinks.length,
    filteredDevice,
    devices: filteredDevices,
    links: filteredLinks,
  };
}

export async function runInspectTopology(
  options: { device?: string; json?: boolean; deprecationLabel?: string } = {},
): Promise<void> {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    const result = await inspectTopologySnapshot(controller, options.device);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (options.deprecationLabel) {
      console.log(chalk.yellow(options.deprecationLabel));
    }

    if (result.deviceCount === 0) {
      console.log(chalk.yellow("No hay dispositivos en la topología."));
      console.log(
        chalk.gray("Abre un lab en Packet Tracer y verifica que el runtime esté cargado."),
      );
      return;
    }

    console.log(chalk.bold("\n🌐 Topología inspeccionada\n"));
    console.log(chalk.cyan("─".repeat(60)));
    console.log(chalk.yellow(`Dispositivos (${result.deviceCount}):`));
    console.log(chalk.cyan("─".repeat(60)));

    for (const device of result.devices) {
      console.log(
        "  " +
          chalk.cyan(device.name.padEnd(20)) +
          chalk.gray(device.model).padEnd(15) +
          chalk.yellow(device.type),
      );
    }

    console.log(chalk.cyan("\n─".repeat(60)));
    console.log(chalk.yellow(`Conexiones (${result.linkCount}):`));
    console.log(chalk.cyan("─".repeat(60)));

    if (result.links.length === 0) {
      console.log(chalk.gray("  Sin conexiones."));
    } else {
      for (const link of result.links) {
        console.log(
          "  " +
            chalk.cyan(link.device1) +
            chalk.gray(`.${link.port1}`) +
            chalk.yellow(" ↔ ") +
            chalk.cyan(link.device2) +
            chalk.gray(`.${link.port2}`),
        );
      }
    }

    console.log(chalk.cyan("─".repeat(60)));
    console.log();
  } finally {
    await controller.stop();
  }
}

export function createInspectTopologyCommand(): Command {
  return new Command("topology")
    .description("Inspeccionar la topología materializada del canvas PT")
    .option("--device <device>", "Filtrar por dispositivo")
    .option("--json", "Salida en JSON", false)
    .action(async function (options: { device?: string; json?: boolean }) {
      await runInspectTopology({ device: options.device, json: options.json });
    });
}
