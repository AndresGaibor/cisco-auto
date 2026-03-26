// ============================================================================
// PT Control V2 - Config Commands
// ============================================================================

import { createDefaultPTController, PTController } from "../controller/index.js";
import { homedir } from "node:os";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CONFIG_FILE = `${process.env.HOME ?? homedir()}/.pt-control-v2.json`;

function readCliConfig(): Record<string, string> {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeCliConfig(config: Record<string, string>): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export async function configCommand(
  subcommand: string | undefined,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const controller = createDefaultPTController();

  switch (subcommand) {
    case "ios":
      await handleIos(controller, positional, options);
      break;
    case "host":
      await handleHost(controller, positional, options);
      break;
    case "set":
      await handleSet(positional);
      break;
    case "get":
      await handleGet(positional);
      break;
    default:
      if (subcommand) {
        console.error(`Unknown config subcommand: ${subcommand}`);
      }
      console.log(`
Config Commands:
  pt config ios <device> [command1] [command2] ...
  pt config ios <device> --commands "cmd1" "cmd2" ...
  pt config host <device> [--ip <address>] [--mask <mask>] [--gateway <gateway>] [--dns <dns>] [--dhcp]
  pt config set <key> <value>
  pt config get <key>

Examples:
  pt config ios R1 enable "configure terminal" "hostname Router1" end
  pt config ios S1 enable "configure terminal" "vlan 10" "name SALES" end
  pt config host PC1 --ip 192.168.1.10 --mask 255.255.255.0 --gateway 192.168.1.1
  pt config host PC1 --dhcp
  pt config set dev-dir ~/pt-dev
  pt config get dev-dir
`);
      process.exit(1);
  }
}

async function handleSet(positional: string[]): Promise<void> {
  const [key, ...rest] = positional;
  const value = rest.join(" ").trim();

  if (!key || !value) {
    console.error("Usage: pt config set <key> <value>");
    process.exit(1);
  }

  const config = readCliConfig();
  config[key] = value;
  writeCliConfig(config);

  console.log(`Config saved: ${key}=${value}`);
}

async function handleGet(positional: string[]): Promise<void> {
  const [key] = positional;
  const config = readCliConfig();

  if (!key) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  const value = config[key];

  if (typeof value === "undefined") {
    console.log(`Config not set: ${key}`);
    process.exitCode = 1;
    return;
  }

  console.log(value);
}

async function handleIos(
  controller: PTController,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const [device, ...positionalCommands] = positional;

  if (!device) {
    console.error("Usage: pt config ios <device> --commands \"cmd1\" \"cmd2\" ...");
    console.error("Example: pt config ios R1 --commands \"conf t\" \"hostname R1\"");
    process.exit(1);
  }

  let commands: string[] = [];
  const commandsOpt = options.commands;

  if (typeof commandsOpt === "string") {
    if (commandsOpt.startsWith("[")) {
      try {
        commands = JSON.parse(commandsOpt);
      } catch {
        commands = [commandsOpt];
      }
    } else {
      commands = [commandsOpt];
    }
  } else if (Array.isArray(commandsOpt)) {
    commands = commandsOpt;
  }

  if (commands.length === 0 && positionalCommands.length > 0) {
    commands = positionalCommands;
  }

  if (commands.length === 0) {
    console.error("Error: No commands specified. Use --commands \"cmd1\" \"cmd2\" ...");
    process.exit(1);
  }

  const save = options.save !== false; // Default to true

  await controller.start();

  try {
    await controller.configIos(device, commands, { save });
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, device, commands, saved: save }));
    } else {
      console.log(`IOS commands executed on ${device}:`);
      for (const cmd of commands) {
        console.log(`  > ${cmd}`);
      }
      if (save) {
        console.log("  Configuration saved.");
      }
    }
  } finally {
    await controller.stop();
  }
}

async function handleHost(
  controller: PTController,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const [device] = positional;

  if (!device) {
    console.error("Usage: pt config host <device> [--ip <address>] [--mask <mask>] [--gateway <gateway>] [--dns <dns>] [--dhcp]");
    console.error("Example: pt config host PC1 --ip 192.168.1.10 --mask 255.255.255.0 --gateway 192.168.1.1");
    process.exit(1);
  }

  const hostOptions: {
    ip?: string;
    mask?: string;
    gateway?: string;
    dns?: string;
    dhcp?: boolean;
  } = {};

  if (options.ip) hostOptions.ip = options.ip as string;
  if (options.mask) hostOptions.mask = options.mask as string;
  if (options.gateway) hostOptions.gateway = options.gateway as string;
  if (options.dns) hostOptions.dns = options.dns as string;
  if (options.dhcp) hostOptions.dhcp = true;

  if (Object.keys(hostOptions).length === 0) {
    console.error("Error: No configuration options specified.");
    console.error("Use at least one of: --ip, --mask, --gateway, --dns, --dhcp");
    process.exit(1);
  }

  await controller.start();

  try {
    await controller.configHost(device, hostOptions);
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, device, config: hostOptions }));
    } else {
      console.log(`Host configuration applied to ${device}:`);
      if (hostOptions.dhcp) {
        console.log("  Mode: DHCP");
      } else {
        if (hostOptions.ip) console.log(`  IP: ${hostOptions.ip}`);
        if (hostOptions.mask) console.log(`  Mask: ${hostOptions.mask}`);
        if (hostOptions.gateway) console.log(`  Gateway: ${hostOptions.gateway}`);
        if (hostOptions.dns) console.log(`  DNS: ${hostOptions.dns}`);
      }
    }
  } finally {
    await controller.stop();
  }
}
