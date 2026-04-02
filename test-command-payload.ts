#!/usr/bin/env bun

/**
 * Test simple para verificar que los comandos tengan el payload.type correcto
 */

import { FileBridgeV2 } from "./packages/file-bridge/src/file-bridge-v2.js";

const PT_DEV_DIR = "/Users/andresgaibor/pt-dev";

async function testCommandPayload() {
  console.log("🧪 Testing command payload structure...\n");

  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "test-payload",
    maxPendingCommands: 5,
  });

  try {
    console.log("1. Starting bridge...");
    bridge.start();
    
    if (!bridge.isReady()) {
      console.log("❌ Bridge not ready");
      return;
    }

    console.log("2. Sending single snapshot command...");
    
    const result = await bridge.sendCommandAndWait("snapshot", {}, 15000);
    
    if (result.ok) {
      console.log("✅ Command successful!");
      console.log("   Result type:", typeof result.value);
      if (result.value && typeof result.value === 'object') {
        const snapshot = result.value as any;
        console.log("   Devices found:", Object.keys(snapshot.devices || {}).length);
        console.log("   Links found:", Object.keys(snapshot.links || {}).length);
      }
    } else {
      console.log("❌ Command failed:", result.error);
    }

  } catch (error) {
    console.log("❌ Test error:", (error as Error).message);
  } finally {
    await bridge.stop();
    console.log("✅ Bridge stopped");
  }
}

testCommandPayload().catch(console.error);