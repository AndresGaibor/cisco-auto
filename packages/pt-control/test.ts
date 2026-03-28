#!/usr/bin/env bun

/**
 * PT Control CLI - Test Script
 * 
 * Este script prueba el bridge de comunicación con Packet Tracer
 */

import { FileBridge } from "../src/bridge/file-bridge.js";
import type { CommandPayload, PTEvent } from "../src/types/index.js";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const DEV_DIR = `${process.env.HOME ?? "/Users/andresgaibor"}/pt-dev`;
const RUNTIME_SOURCE = resolve(import.meta.dir, "../../pt-extension/runtime.js");

async function main() {
  console.log("=== PT Control Test ===\n");

  // Setup dev directory
  if (!existsSync(DEV_DIR)) {
    mkdirSync(DEV_DIR, { recursive: true });
    console.log(`✓ Created ${DEV_DIR}`);
  }

  // Copy runtime if not exists
  const runtimeDest = resolve(DEV_DIR, "runtime.js");
  if (!existsSync(runtimeDest)) {
    copyFileSync(RUNTIME_SOURCE, runtimeDest);
    console.log(`✓ Copied runtime.js to ${runtimeDest}`);
  }

  // Create bridge
  const bridge = new FileBridge({
    devDir: DEV_DIR,
  });

  // Register event handlers
  bridge.onEvent((event: PTEvent) => {
    console.log(`[PT Event] ${event.type}:`, event);
  });

  // Start bridge
  await bridge.start();
  console.log("✓ Bridge started\n");

  // Wait a bit for PT to initialize
  console.log("Waiting for PT module to initialize...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    // Test 1: Get snapshot
    console.log("\n--- Test 1: Get Snapshot ---");
    const snapshotCmd: CommandPayload = { kind: "snapshot" };
    const snapshotId = await bridge.sendCommand(snapshotCmd);
    const snapshotResult = await bridge.waitForResult(snapshotId, 5000);
    console.log("Snapshot result:", JSON.stringify(snapshotResult, null, 2));

    // Test 2: Add device
    console.log("\n--- Test 2: Add Device ---");
    const addDeviceCmd: CommandPayload = {
      kind: "addDevice",
      name: "TestRouter1",
      model: "2911",
      x: 100,
      y: 100,
    };
    const addDeviceId = await bridge.sendCommand(addDeviceCmd);
    const addDeviceResult = await bridge.waitForResult(addDeviceId, 5000);
    console.log("Add device result:", JSON.stringify(addDeviceResult, null, 2));

    // Test 3: List devices
    console.log("\n--- Test 3: List Devices ---");
    const listCmd: CommandPayload = { kind: "listDevices" };
    const listId = await bridge.sendCommand(listCmd);
    const listResult = await bridge.waitForResult(listId, 5000);
    console.log("List devices result:", JSON.stringify(listResult, null, 2));

    // Test 4: Add another device
    console.log("\n--- Test 4: Add Switch ---");
    const addSwitchCmd: CommandPayload = {
      kind: "addDevice",
      name: "TestSwitch1",
      model: "2960-24TT",
      x: 300,
      y: 100,
    };
    const addSwitchId = await bridge.sendCommand(addSwitchCmd);
    const addSwitchResult = await bridge.waitForResult(addSwitchId, 5000);
    console.log("Add switch result:", JSON.stringify(addSwitchResult, null, 2));

    // Test 5: Create link
    console.log("\n--- Test 5: Create Link ---");
    const addLinkCmd: CommandPayload = {
      kind: "addLink",
      dev1: "TestRouter1",
      port1: "GigabitEthernet0/0",
      dev2: "TestSwitch1",
      port2: "GigabitEthernet0/1",
      cableType: "straight",
    };
    const addLinkId = await bridge.sendCommand(addLinkCmd);
    const addLinkResult = await bridge.waitForResult(addLinkId, 5000);
    console.log("Add link result:", JSON.stringify(addLinkResult, null, 2));

    // Test 6: Inspect device
    console.log("\n--- Test 6: Inspect Device ---");
    const inspectCmd: CommandPayload = {
      kind: "inspect",
      device: "TestRouter1",
    };
    const inspectId = await bridge.sendCommand(inspectCmd);
    const inspectResult = await bridge.waitForResult(inspectId, 5000);
    console.log("Inspect result:", JSON.stringify(inspectResult, null, 2));

    // Test 7: Final snapshot
    console.log("\n--- Test 7: Final Snapshot ---");
    const finalSnapshotId = await bridge.sendCommand(snapshotCmd);
    const finalSnapshotResult = await bridge.waitForResult(finalSnapshotId, 5000);
    console.log("Final snapshot:", JSON.stringify(finalSnapshotResult, null, 2));

    console.log("\n✅ All tests completed!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    await bridge.stop();
    console.log("\n✓ Bridge stopped");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
