// ============================================================================
// PT Control V2 - Link Commands
// ============================================================================

import { createDefaultPTController, PTController } from "../controller/index.js";
import type { LinkState, CableType } from "../types/index.js";

export async function linkCommand(
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
    default:
      if (subcommand) {
        console.error(`Unknown link subcommand: ${subcommand}`);
      }
      console.log(`
Link Commands:
  pt link list [--format json|table]
  pt link add <device1:port1> <device2:port2> [--type <cable-type>]
  pt link remove <device:port>

Cable Types:
  straight    - Straight-through cable (default for different device types)
  cross       - Crossover cable (for same device types)
  fiber       - Fiber optic cable
  serial      - Serial cable (for WAN connections)
  console     - Console cable (rollover)
  auto        - Auto-detect (default)

Examples:
  pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1
  pt link add R1:GigabitEthernet0/0 R2:GigabitEthernet0/0 --type cross
  pt link remove R1:GigabitEthernet0/0
  pt link list --format table
`);
      process.exit(1);
  }
}

function parsePortSpec(spec: string): { device: string; port: string } {
  const parts = spec.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid port specification: ${spec}. Expected format: device:port`);
  }
  return { device: parts[0], port: parts[1] };
}

async function handleAdd(
  controller: PTController,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const [portSpec1, portSpec2] = positional;

  if (!portSpec1 || !portSpec2) {
    console.error("Usage: pt link add <device1:port1> <device2:port2> [--type <cable-type>]");
    console.error("Example: pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1");
    process.exit(1);
  }

  const { device: device1, port: port1 } = parsePortSpec(portSpec1);
  const { device: device2, port: port2 } = parsePortSpec(portSpec2);
  const linkType = (options.type as CableType) || "auto";

  await controller.start();

  try {
    const link = await controller.addLink(device1, port1, device2, port2, linkType);
    
    if (options.json) {
      console.log(JSON.stringify(link, null, 2));
    } else {
      console.log(`Link added: ${device1}:${port1} <--> ${device2}:${port2}`);
      console.log(`  Cable type: ${link.cableType}`);
      console.log(`  Link ID: ${link.id}`);
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
  const [portSpec] = positional;

  if (!portSpec) {
    console.error("Usage: pt link remove <device:port>");
    console.error("Example: pt link remove R1:GigabitEthernet0/0");
    process.exit(1);
  }

  const { device, port } = parsePortSpec(portSpec);

  await controller.start();

  try {
    await controller.removeLink(device, port);
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, device, port }));
    } else {
      console.log(`Link removed: ${device}:${port}`);
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
  await controller.start();

  try {
    const snapshot = await controller.snapshot();
    const links = Object.values(snapshot.links) as LinkState[];
    const format = String(options.format || (options.json ? "json" : "table")).toLowerCase();

    if (format === "json") {
      console.log(JSON.stringify(links, null, 2));
      return;
    }

    if (links.length === 0) {
      console.log("No links found.");
      return;
    }

    console.log(`\nLinks (${links.length}):\n\n`);
    console.log("  DEVICE:PORT".padEnd(30) + "<-->".padEnd(6) + "DEVICE:PORT".padEnd(30) + "TYPE");
    console.log("  " + "-".repeat(75));

    for (const link of links) {
      const left = `${link.device1}:${link.port1}`.padEnd(29);
      const right = `${link.device2}:${link.port2}`.padEnd(29);
      console.log(`  ${left} <---> ${right} ${link.cableType}`);
    }

    console.log("");
  } finally {
    await controller.stop();
  }
}
