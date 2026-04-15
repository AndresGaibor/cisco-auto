#!/usr/bin/env bun
/**
 * Debug Console - pt device info and configuration
 *
 * Usage:
 *   bun debug-console.ts                     # All devices
 *   bun debug-console.ts R1                  # Specific device
 *   bun debug-console.ts --json              # JSON output
 *   bun debug-console.ts --full              # Full details including IOS config
 */

import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { BridgePathLayout } from "@cisco-auto/file-bridge/shared/path-layout.js";
import { getDefaultDevDir } from "@cisco-auto/pt-cli/system/paths.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ============================================================================
// Config
// ============================================================================

const PT_DEV_DIR = process.env.PT_DEV_DIR ?? getDefaultDevDir();
const BRIDGE_ROOT = join(PT_DEV_DIR, "bridge");

// ============================================================================
// Helpers
// ============================================================================

async function sendCommand<T = unknown>(
  bridge: FileBridgeV2,
  type: string,
  payload: Record<string, unknown> = {},
  timeoutMs = 15000
): Promise<{ ok: boolean; value?: T; error?: string; raw?: string; [key: string]: unknown }> {
  try {
    const result = await bridge.sendCommandAndWait<Record<string, unknown>, T>(
      type,
      payload,
      timeoutMs
    );
    return result as T & { ok: boolean };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function getBridgePaths() {
  return new BridgePathLayout(BRIDGE_ROOT);
}

// ============================================================================
// Commands
// ============================================================================

async function cmdPing(bridge: FileBridgeV2) {
  const result = await sendCommand(bridge, "__ping", {});
  return result;
}

async function cmdListDevices(bridge: FileBridgeV2) {
  const result = await sendCommand<{ devices?: Array<Record<string, unknown>> }>(
    bridge,
    "listDevices",
    { id: `debug_${Date.now()}` }
  );
  return result;
}

async function cmdSnapshot(bridge: FileBridgeV2) {
  const result = await sendCommand(bridge, "snapshot", {}, 20000);
  return result;
}

async function cmdHardwareInfo(bridge: FileBridgeV2, device: string) {
  const result = await sendCommand(
    bridge,
    "hardwareInfo",
    { device },
    10000
  );
  return result;
}

async function cmdExecIos(bridge: FileBridgeV2, device: string, command: string) {
  const result = await sendCommand(
    bridge,
    "execIos",
    { device, command, ensurePrivileged: true, dismissInitialDialog: true },
    15000
  );
  return result;
}

// ============================================================================
// Formatters
// ============================================================================

function formatDevice(device: Record<string, unknown>, index: number): string {
  const lines: string[] = [];
  const name = String(device.name ?? "unknown");
  const model = String(device.model ?? device.type ?? "unknown");
  const type = String(device.type ?? "unknown");
  const power = device.power ? "ON" : "OFF";
  const ip = device.ip ? String(device.ip) : "no IP";
  const hostname = device.hostname ? String(device.hostname) : "";

  lines.push(`\n┌─ ${name} [${index + 1}]`);
  lines.push(`│ Model:    ${model}`);
  lines.push(`│ Type:     ${type}`);
  lines.push(`│ Power:    ${power}`);
  lines.push(`│ IP:       ${ip}`);
  if (hostname) lines.push(`│ Hostname: ${hostname}`);
  if (device.x !== undefined && device.y !== undefined) {
    lines.push(`│ Position: (${device.x}, ${device.y})`);
  }
  lines.push(`└────────────`);
  return lines.join("\n");
}

function formatSnapshot(snapshot: Record<string, unknown>): string {
  const devices = snapshot.devices as Record<string, Record<string, unknown>> | undefined;
  const links = snapshot.links as Record<string, Record<string, unknown>> | undefined;
  const deviceCount = devices ? Object.keys(devices).length : 0;
  const linkCount = links ? Object.keys(links).length : 0;

  const lines: string[] = [];
  lines.push(`\n═══ Topology Snapshot ═══`);
  lines.push(`Devices: ${deviceCount}`);
  lines.push(`Links:   ${linkCount}`);

  if (devices) {
    lines.push(`\nDevices:`);
    Object.entries(devices).forEach(([id, device], i) => {
      const power = device.power ? "ON " : "OFF";
      const ip = device.ip ? String(device.ip) : "no IP";
      lines.push(`  [${power}] ${id} - ${ip}`);
    });
  }

  if (links) {
    lines.push(`\nLinks:`);
    Object.entries(links).forEach(([id, link]) => {
      lines.push(`  ${id}: ${link.device1}:${link.port1} ↔ ${link.device2}:${link.port2}`);
    });
  }

  return lines.join("\n");
}

function formatIosOutput(command: string, output: string): string {
  const lines = output.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return "  (no output)";

  const formatted = lines.map(l => `  ${l}`);
  return [`\n  💬 ${command}`, ...formatted, ""].join("\n");
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = Bun.argv.slice(2);
  const targetDevice = args.find(a => !a.startsWith("--"));
  const outputJson = args.includes("--json");
  const fullDetails = args.includes("--full");
  const showSnapshot = args.includes("--snapshot");
  const help = args.includes("--help");

  if (help) {
    console.log(`
Debug Console - pt devices info

Usage:
  bun debug-console.ts [device] [options]

Options:
  --json       JSON output
  --full       Full IOS config for each device (show run)
  --snapshot   Include topology snapshot
  --help       Show this help

Examples:
  bun debug-console.ts                  # List all devices
  bun debug-console.ts R1               # Info for R1 only
  bun debug-console.ts --full           # Full details with IOS config
  bun debug-console.ts --snapshot --json # Snapshot in JSON
`);
    return;
  }

  console.log(`\n🔍 Debug Console`);
  console.log(`   Bridge: ${BRIDGE_ROOT}`);

  // Check bridge exists
  if (!existsSync(BRIDGE_ROOT)) {
    console.error(`\n❌ Bridge directory not found: ${BRIDGE_ROOT}`);
    console.error(`   Is PT running? Is the bridge initialized?`);
    process.exit(1);
  }

  const paths = getBridgePaths();
  const bridge = new FileBridgeV2({
    root: BRIDGE_ROOT,
    consumerId: "debug-console",
    enableBackpressure: false,
  });

  try {
    bridge.start();
    await new Promise(r => setTimeout(r, 500)); // Wait for lease

    // Ping first
    const pingResult = await cmdPing(bridge);
    if (!pingResult.ok) {
      console.error(`\n❌ Bridge not responding to ping`);
      process.exit(1);
    }

    // List devices
    const listResult = await cmdListDevices(bridge);

    if (outputJson) {
      const output: Record<string, unknown> = {
        ping: pingResult,
        bridgeReady: bridge.isReady(),
      };

      if (showSnapshot) {
        const snapshotResult = await cmdSnapshot(bridge);
        output.snapshot = snapshotResult;
      }

      if (listResult.ok && listResult.value) {
        const val = listResult.value as { devices?: Array<Record<string, unknown>> };
        output.devices = val.devices ?? [];
      }

      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Human readable
    console.log(`\n✓ Bridge ready`);

    // Snapshot if requested
    if (showSnapshot) {
      const snapshotResult = await cmdSnapshot(bridge);
      if (snapshotResult.ok && snapshotResult.value) {
        console.log(formatSnapshot(snapshotResult.value as Record<string, unknown>));
      } else if (snapshotResult.error) {
        console.log(`\n⚠ Snapshot error: ${snapshotResult.error}`);
      }
    }

    // Devices
    if (!listResult.ok) {
      console.error(`\n❌ listDevices failed: ${listResult.error}`);
      process.exit(1);
    }

    const val = listResult.value as { devices?: Array<Record<string, unknown>> } | undefined;
    const devices = val?.devices ?? [];

    if (devices.length === 0) {
      console.log(`\n⚠ No devices found`);
      return;
    }

    const filtered = targetDevice
      ? devices.filter(d => d.name === targetDevice)
      : devices;

    if (targetDevice && filtered.length === 0) {
      console.error(`\n❌ Device not found: ${targetDevice}`);
      process.exit(1);
    }

    console.log(`\n═══ Devices (${filtered.length}) ═══`);

    for (let i = 0; i < filtered.length; i++) {
      const device = filtered[i];
      console.log(formatDevice(device, i));

      if (fullDetails && device.name) {
        const name = String(device.name);

        // Get hardware info
        const hwResult = await cmdHardwareInfo(bridge, name);
        if (hwResult.ok && hwResult.value) {
          const hw = hwResult.value as Record<string, unknown>;
          console.log(`\n  📋 Hardware Info:`);
          Object.entries(hw).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
              console.log(`     ${k}: ${JSON.stringify(v)}`);
            }
          });
        }

        // Show IOS config
        const iosDevice = device as Record<string, unknown>;
        if (iosDevice.type === "Router" || iosDevice.type === "Switch") {
          console.log(`\n  📋 IOS Configuration:`);

          // Show version
          const verResult = await cmdExecIos(bridge, name, "show version");
          if (verResult.ok && verResult.raw) {
            console.log(formatIosOutput("show version", String(verResult.raw)));
          }

          // Show running config (first 30 lines)
          const runResult = await cmdExecIos(bridge, name, "show running-config | head 30");
          if (runResult.ok && runResult.raw) {
            console.log(formatIosOutput("show running-config | head 30", String(runResult.raw)));
          }

          // Show IP interface brief
          const ipResult = await cmdExecIos(bridge, name, "show ip interface brief");
          if (ipResult.ok && ipResult.raw) {
            console.log(formatIosOutput("show ip interface brief", String(ipResult.raw)));
          }
        }
      }
    }

    console.log(`\n`);
  } finally {
    await bridge.stop();
  }
}

main().catch(e => {
  console.error(`\n❌ Fatal:`, e);
  process.exit(1);
});
