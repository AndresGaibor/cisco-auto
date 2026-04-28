#!/usr/bin/env bun

/**
 * Test rápido de addDevice con payload correcto
 */

import { FileBridgeV2 } from "../../packages/file-bridge/src/file-bridge-v2.js";
import { getSmokePtDevDir } from "./smoke-paths.js";

const PT_DEV_DIR = getSmokePtDevDir();

async function testAddDevice() {
  console.log("🧪 Testing addDevice with correct payload...\n");

  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "test-adddevice",
    maxPendingCommands: 5,
  });

  try {
    console.log("1. Starting bridge...");
    bridge.start();
    
    if (!bridge.isReady()) {
      console.log("❌ Bridge not ready");
      return;
    }

    console.log("2. Adding router with model 2811...");
    const routerResult = await bridge.sendCommandAndWait("addDevice", {
      model: "2811"
    }, 15000);
    
    if (routerResult.ok) {
      console.log("✅ Router added successfully!");
      console.log("   Result:", JSON.stringify(routerResult.value, null, 2));
    } else {
      console.log("❌ Router add failed:", routerResult.error);
    }

    console.log("\n3. Adding switch with model 2960...");
    const switchResult = await bridge.sendCommandAndWait("addDevice", {
      model: "2960"
    }, 15000);
    
    if (switchResult.ok) {
      console.log("✅ Switch added successfully!");
      console.log("   Result:", JSON.stringify(switchResult.value, null, 2));
    } else {
      console.log("❌ Switch add failed:", switchResult.error);
    }

    console.log("\n4. Listing devices to confirm...");
    const listResult = await bridge.sendCommandAndWait("listDevices", {}, 15000);
    
    if (listResult.ok) {
      console.log("✅ Device list retrieved!");
      const devices = listResult.value as any[];
      console.log(`   Found ${devices.length} devices:`);
      devices.forEach((device, i) => {
        console.log(`   ${i+1}. ${device.name} (${device.model}) - ${device.type}`);
      });
    } else {
      console.log("❌ List devices failed:", listResult.error);
    }

  } catch (error) {
    console.log("❌ Test error:", (error as Error).message);
  } finally {
    await bridge.stop();
    console.log("\n✅ Bridge stopped");
  }
}

testAddDevice().catch(console.error);
