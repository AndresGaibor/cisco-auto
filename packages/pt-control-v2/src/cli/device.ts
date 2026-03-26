// ============================================================================
// PT Control V2 - Device Commands
// ============================================================================

import { createDefaultPTController, PTController } from "../controller/index.js";
import type { DeviceState } from "../types/index.js";

export async function deviceCommand(
  subcommand: string | undefined,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const controller = createDefaultPTController();

  switch (subcommand) {
    case "add":
      await handleAdd(controller, positional, options);
      break;
    case "remove":
    case "rm":
      await handleRemove(controller, positional, options);
      break;
    case "list":
    case "ls":
      await handleList(controller, positional, options);
      break;
    case "rename":
      await handleRename(controller, positional, options);
      break;
    default:
      if (subcommand) {
        console.error(`Unknown device subcommand: ${subcommand}`);
      }
      console.log(`
Device Commands:
  pt device list [--format json|table]
  pt device add <name> <type> [--x <num>] [--y <num>]
  pt device remove <name>
  pt device rename <old-name> <new-name>

Examples:
  pt device add R1 router --x 100 --y 100
  pt device add S1 switch --x 200 --y 100
  pt device add PC1 pc --x 100 --y 200
  pt device list --format table
  pt device remove R1
  pt device rename R1 Router1
`);
      process.exit(1);
  }
}

async function handleAdd(
  controller: PTController,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const [name, model] = positional;

  if (!name || !model) {
    console.error("Usage: pt device add <name> <type> [--x <num>] [--y <num>]");
    console.error("Example: pt device add R1 router --x 100 --y 100");
    process.exit(1);
  }

  const x = typeof options.x === "string" ? parseInt(options.x, 10) : 100;
  const y = typeof options.y === "string" ? parseInt(options.y, 10) : 100;

  await controller.start();

  try {
    const device = await controller.addDevice(name, model, { x, y });
    
    if (options.json) {
      console.log(JSON.stringify(device, null, 2));
    } else {
      console.log(`Device added: ${device.name} (${device.model})`);
      console.log(`  Type: ${device.type}`);
      console.log(`  Position: (${device.x}, ${device.y})`);
      if (device.ports?.length) {
        console.log(`  Ports: ${device.ports.length}`);
      }
    }
  } finally {
    await controller.stop();
  }
}

async function handleRemove(
  controller: PTController,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const [name] = positional;

  if (!name) {
    console.error("Usage: pt device remove <name>");
    console.error("Example: pt device remove R1");
    process.exit(1);
  }

  await controller.start();

  try {
    await controller.removeDevice(name);
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, name }));
    } else {
      console.log(`Device removed: ${name}`);
    }
  } finally {
    await controller.stop();
  }
}

async function handleList(
  controller: PTController,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const filter = options.filter as string | undefined;
  const format = String(options.format || (options.json ? "json" : "table")).toLowerCase();

  function normalizarDispositivos(valor: unknown): DeviceState[] {
    if (Array.isArray(valor)) {
      return valor as DeviceState[];
    }

    if (!valor || typeof valor !== "object") {
      return [];
    }

    const dispositivos = (valor as { devices?: unknown }).devices;

    if (Array.isArray(dispositivos)) {
      return dispositivos as DeviceState[];
    }

    if (dispositivos && typeof dispositivos === "object") {
      return Object.values(dispositivos as Record<string, DeviceState>);
    }

    return [];
  }

  await controller.start();

  try {
    const devices = normalizarDispositivos(await controller.listDevices() as unknown);

    let filtered = devices;
    if (filter) {
      filtered = devices.filter(d => 
        d.type === filter || 
        d.model.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (format === "json") {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }

    if (filtered.length === 0) {
      console.log("No devices found.");
      return;
    }

    console.log(`\nDevices (${filtered.length}):\n`);
    console.log("  NAME".padEnd(15) + "MODEL".padEnd(15) + "TYPE".padEnd(15) + "STATUS");
    console.log("  " + "-".repeat(55));

    for (const device of filtered) {
      const name = device.name.padEnd(14);
      const model = device.model.padEnd(14);
      const type = device.type.padEnd(14);
      const status = device.power ? "on" : "off";
      console.log(`  ${name}${model}${type}${status}`);
    }

    console.log("");
  } finally {
    await controller.stop();
  }
}

async function handleRename(
  controller: PTController,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const [oldName, newName] = positional;

  if (!oldName || !newName) {
    console.error("Usage: pt device rename <old-name> <new-name>");
    console.error("Example: pt device rename R1 Router1");
    process.exit(1);
  }

  await controller.start();

  try {
    await controller.renameDevice(oldName, newName);
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, oldName, newName }));
    } else {
      console.log(`Device renamed: ${oldName} -> ${newName}`);
    }
  } finally {
    await controller.stop();
  }
}
