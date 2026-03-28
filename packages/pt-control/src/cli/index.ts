#!/usr/bin/env bun

/**
 * PT CLI - Main entry point
 */

import { FileBridge } from "../bridge/file-bridge.js";
import type { PTEvent } from "../types/index.js";
import { existsSync, mkdirSync, copyFileSync } from "fs";
import { resolve } from "path";

const DEFAULT_DEV_DIR = `${process.env.HOME ?? "/Users/andresgaibor"}/pt-dev`;
const DEV_DIR = process.env.PT_DEV_DIR || DEFAULT_DEV_DIR;
const RUNTIME_SOURCE = resolve(import.meta.dir, "../../../pt-extension/runtime.js");

let bridge: FileBridge | null = null;

async function ensureSetup() {
  if (!existsSync(DEV_DIR)) {
    mkdirSync(DEV_DIR, { recursive: true });
  }

  const runtimeDest = resolve(DEV_DIR, "runtime.js");
  if (!existsSync(runtimeDest)) {
    copyFileSync(RUNTIME_SOURCE, runtimeDest);
    console.log(`✓ Initialized ${DEV_DIR}`);
  }
}

async function initBridge() {
  if (bridge) return bridge;

  bridge = new FileBridge({ devDir: DEV_DIR });

  // Show events in real-time
  bridge.onEvent((event: PTEvent) => {
    if (event.type === "log") {
      console.log(`[PT] ${event.level}: ${event.message}`);
    } else if (event.type === "error") {
      console.error(`[PT Error] ${event.message}`);
    }
  });

  await bridge.start();
  return bridge;
}

async function deviceAdd(args: string[]) {
  const name = args[0];
  const model = args[1];
  const x = parseInt(args[2] || "100");
  const y = parseInt(args[3] || "100");

  if (!name || !model) {
    console.error("Usage: pt device add <name> <model> [x] [y]");
    console.error("Example: pt device add R1 2911 100 100");
    return;
  }

  const bridge = await initBridge();
  const id = await bridge.sendCommand({
    kind: "addDevice",
    name,
    model,
    x,
    y,
  });

  const result = await bridge.waitForResult(id);
  if (result.type === "result" && result.ok) {
    console.log(`✓ Device added: ${name} (${model})`);
  } else {
    console.error(`✗ Failed to add device`);
  }
}

async function deviceRemove(args: string[]) {
  const name = args[0];

  if (!name) {
    console.error("Usage: pt device remove <name>");
    return;
  }

  const bridge = await initBridge();
  const id = await bridge.sendCommand({
    kind: "removeDevice",
    name,
  });

  const result = await bridge.waitForResult(id);
  if (result.type === "result" && result.ok) {
    console.log(`✓ Device removed: ${name}`);
  } else {
    console.error(`✗ Failed to remove device`);
  }
}

async function deviceList() {
  const bridge = await initBridge();
  const id = await bridge.sendCommand({
    kind: "listDevices",
  });

  const result = await bridge.waitForResult(id);
  if (result.type === "result" && result.ok && result.value) {
    const data = result.value as any;
    console.log(`\nDevices (${data.count}):`);
    data.devices.forEach((dev: any) => {
      console.log(`  - ${dev.name} (${dev.model}) [${dev.power ? "ON" : "OFF"}]`);
    });
  } else {
    console.error(`✗ Failed to list devices`);
  }
}

async function linkAdd(args: string[]) {
  const [dev1Port, dev2Port, cableType = "auto"] = args;

  if (!dev1Port || !dev2Port) {
    console.error("Usage: pt link add <dev1:port1> <dev2:port2> [cableType]");
    console.error("Example: pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight");
    return;
  }

  const [dev1, port1] = dev1Port.split(":");
  const [dev2, port2] = dev2Port.split(":");

  if (!dev1 || !port1 || !dev2 || !port2) {
    console.error("Invalid format. Use dev:port");
    return;
  }

  const bridge = await initBridge();
  const id = await bridge.sendCommand({
    kind: "addLink",
    dev1,
    port1,
    dev2,
    port2,
    cableType,
  });

  const result = await bridge.waitForResult(id);
  if (result.type === "result" && result.ok) {
    console.log(`✓ Link created: ${dev1}:${port1} ←→ ${dev2}:${port2}`);
  } else {
    console.error(`✗ Failed to create link`);
  }
}

async function configHost(args: string[]) {
  const name = args[0];
  const ip = args[1];
  const mask = args[2] || "255.255.255.0";
  const gateway = args[3];
  const dns = args[4];

  if (!name || !ip) {
    console.error("Usage: pt config host <name> <ip> [mask] [gateway] [dns]");
    console.error("Example: pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1");
    return;
  }

  const bridge = await initBridge();
  const id = await bridge.sendCommand({
    kind: "configHost",
    device: name,
    ip,
    mask,
    gateway,
    dns,
  });

  const result = await bridge.waitForResult(id);
  if (result.type === "result" && result.ok) {
    console.log(`✓ Host configured: ${name} → ${ip}/${mask}`);
  } else {
    console.error(`✗ Failed to configure host`);
  }
}

async function configIos(args: string[]) {
  const name = args[0];
  const commands = args.slice(1);

  if (!name || commands.length === 0) {
    console.error("Usage: pt config ios <name> <command1> [command2] [...]");
    console.error('Example: pt config ios R1 "conf t" "hostname R1" "end"');
    return;
  }

  const bridge = await initBridge();
  const id = await bridge.sendCommand({
    kind: "configIos",
    device: name,
    commands,
  });

  const result = await bridge.waitForResult(id);
  if (result.type === "result" && result.ok) {
    console.log(`✓ IOS configured: ${name} (${commands.length} commands)`);
  } else {
    console.error(`✗ Failed to configure IOS`);
  }
}

async function snapshot() {
  const bridge = await initBridge();
  const id = await bridge.sendCommand({
    kind: "snapshot",
  });

  const result = await bridge.waitForResult(id);
  if (result.type === "result" && result.ok && result.value) {
    const data = result.value as any;
    const snapshot = data.snapshot;
    
    console.log("\nTopology Snapshot:");
    console.log(`  Devices: ${snapshot.deviceCount}`);
    console.log(`  Links: ${snapshot.linkCount ?? "N/A"}`);
    console.log("\nDevices:");
    
    snapshot.devices.forEach((dev: any) => {
      console.log(`  - ${dev.name}`);
      console.log(`    Model: ${dev.model}`);
      console.log(`    Power: ${dev.power ? "ON" : "OFF"}`);
      console.log(`    Ports: ${dev.ports.length}`);
    });
  } else {
    console.error(`✗ Failed to get snapshot`);
  }
}

async function inspect(args: string[]) {
  const name = args[0];

  if (!name) {
    console.error("Usage: pt inspect <device>");
    return;
  }

  const bridge = await initBridge();
  const id = await bridge.sendCommand({
    kind: "inspect",
    device: name,
  });

  const result = await bridge.waitForResult(id);
  if (result.type === "result" && result.ok && result.value) {
    const data = result.value as any;
    const device = data.device;
    
    console.log(`\nDevice: ${device.name}`);
    console.log(`Model: ${device.model}`);
    console.log(`Power: ${device.power ? "ON" : "OFF"}`);
    console.log(`\nPorts (${device.ports.length}):`);
    
    device.ports.forEach((port: any) => {
      console.log(`  - ${port.name}`);
      if (port.ip) {
        console.log(`    IP: ${port.ip}/${port.mask}`);
        console.log(`    Gateway: ${port.gateway || "N/A"}`);
        console.log(`    MAC: ${port.mac}`);
      }
    });
  } else {
    console.error(`✗ Failed to inspect device`);
  }
}

async function showHelp() {
  console.log(`
PT Control CLI - Control Packet Tracer in real-time

Usage:
  pt <command> [args...]

Commands:

  Device Management:
    device add <name> <model> [x] [y]     Add a device
    device remove <name>                   Remove a device
    device list                            List all devices

  Link Management:
    link add <dev1:port1> <dev2:port2> [type]  Create a link
    
  Configuration:
    config host <name> <ip> [mask] [gateway] [dns]  Configure host IP
    config ios <name> <cmd1> [cmd2...]              Configure IOS device

  Inspection:
    snapshot                              Get topology snapshot
    inspect <device>                      Inspect device details

  Help:
    help                                  Show this help

Examples:
  pt device add R1 2911 100 100
  pt device add S1 2960-24TT 300 100
  pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight
  pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1
  pt config ios R1 "conf t" "hostname R1" "int g0/0" "ip address 1.1.1.1 255.0.0.0" "no shut"
  pt snapshot
  pt inspect R1

Environment:
  PT_DEV_DIR    Directory for PT bridge (default: ~/pt-dev)

Note: Packet Tracer must be running with the PT Control module installed.
  `);
}

async function main() {
  const [, , command, subcommand, ...args] = process.argv;

  await ensureSetup();

  if (!command || command === "help") {
    await showHelp();
    process.exit(0);
  }

  try {
    if (command === "device") {
      if (subcommand === "add") await deviceAdd(args);
      else if (subcommand === "remove") await deviceRemove(args);
      else if (subcommand === "list") await deviceList();
      else {
        console.error(`Unknown device subcommand: ${subcommand}`);
        await showHelp();
      }
    } else if (command === "link") {
      if (subcommand === "add") await linkAdd(args);
      else {
        console.error(`Unknown link subcommand: ${subcommand}`);
        await showHelp();
      }
    } else if (command === "config") {
      if (subcommand === "host") await configHost(args);
      else if (subcommand === "ios") await configIos(args);
      else {
        console.error(`Unknown config subcommand: ${subcommand}`);
        await showHelp();
      }
    } else if (command === "snapshot") {
      await snapshot();
    } else if (command === "inspect") {
      if (!subcommand) {
        console.error("Usage: pt inspect <device>");
        await showHelp();
      } else {
        await inspect([subcommand, ...args]);
      }
    } else {
      console.error(`Unknown command: ${command}`);
      await showHelp();
    }

    if (bridge) {
      await bridge.stop();
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
