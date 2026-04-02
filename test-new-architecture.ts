#!/usr/bin/env bun

/**
 * Test de la nueva arquitectura simplificada PT + FileBridge V2
 * con auto-snapshot y heartbeat monitoring
 */

import { FileBridgeV2 } from "./packages/file-bridge/src/file-bridge-v2.js";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const PT_DEV_DIR = "/Users/andresgaibor/pt-dev";

async function testNewArchitecture() {
  console.log("🚀 Testing new simplified PT architecture...\n");

  // Crear FileBridgeV2 con auto-snapshot y heartbeat monitoring
  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "test-new-arch",
    autoSnapshotIntervalMs: 3000,  // Cada 3s para test rápido
    heartbeatIntervalMs: 1000,     // Cada 1s para test rápido
    maxPendingCommands: 10,
  });

  // Event listeners para monitorear lo que pasa
  bridge.on("topology-changed", (event) => {
    console.log("📍 Topology changed:", event.diff);
  });

  bridge.on("topology-initial", (event) => {
    console.log("📷 Initial snapshot captured:", {
      devices: Object.keys(event.snapshot.devices).length,
      links: Object.keys(event.snapshot.links).length,
    });
  });

  bridge.on("pt-heartbeat-ok", (event) => {
    console.log("💓 PT heartbeat OK (age: " + event.ageMs + "ms)");
  });

  bridge.on("pt-heartbeat-stale", (event) => {
    console.log("⚠️  PT heartbeat STALE (age: " + event.ageMs + "ms)");
  });

  bridge.on("pt-heartbeat-missing", () => {
    console.log("❌ PT heartbeat MISSING");
  });

  bridge.on("auto-snapshot-error", (event) => {
    console.log("🚨 Auto-snapshot error:", event.error);
  });

  try {
    // Iniciar bridge
    console.log("1. Starting FileBridge V2...");
    bridge.start();
    
    if (!bridge.isReady()) {
      console.log("❌ Bridge not ready (lease issue?)");
      return;
    }
    console.log("✅ Bridge ready");

    // Iniciar auto-snapshot y heartbeat monitoring
    console.log("2. Starting auto-snapshot and heartbeat monitoring...");
    bridge.startAutoSnapshot();
    bridge.startHeartbeatMonitoring();
    console.log("✅ Monitoring started");

    // Verificar que los archivos PT existen
    console.log("3. Checking PT files...");
    const mainJsExists = existsSync(join(PT_DEV_DIR, "main.js"));
    const runtimeJsExists = existsSync(join(PT_DEV_DIR, "runtime.js"));
    
    console.log("   main.js exists:", mainJsExists ? "✅" : "❌");
    console.log("   runtime.js exists:", runtimeJsExists ? "✅" : "❌");

    if (!mainJsExists || !runtimeJsExists) {
      console.log("❌ PT files missing, run 'bun run build' in pt-control package");
      return;
    }

    // Test básico: enviar comando snapshot
    console.log("\n4. Testing basic command: snapshot...");
    try {
      const result = await bridge.sendCommandAndWait("snapshot", {}, 10000);
      if (result.ok) {
        console.log("✅ Snapshot command successful");
        const snapshot = result.value;
        if (snapshot && typeof snapshot === 'object') {
          console.log("   Devices:", Object.keys((snapshot as any).devices || {}).length);
          console.log("   Links:", Object.keys((snapshot as any).links || {}).length);
        }
      } else {
        console.log("❌ Snapshot command failed:", result.error?.message);
      }
    } catch (error) {
      console.log("❌ Snapshot command error:", (error as Error).message);
    }

    // Test: listar dispositivos
    console.log("\n5. Testing listDevices command...");
    try {
      const result = await bridge.sendCommandAndWait("listDevices", {}, 10000);
      if (result.ok) {
        console.log("✅ listDevices command successful");
        const devices = result.value;
        if (Array.isArray(devices)) {
          console.log("   Found", devices.length, "devices");
        }
      } else {
        console.log("❌ listDevices command failed:", result.error?.message);
      }
    } catch (error) {
      console.log("❌ listDevices command error:", (error as Error).message);
    }

    // Monitorear por 10 segundos para ver eventos
    console.log("\n6. Monitoring events for 10 seconds...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verificar archivos de heartbeat
    console.log("\n7. Checking heartbeat file...");
    const heartbeatFile = join(PT_DEV_DIR, "heartbeat.json");
    if (existsSync(heartbeatFile)) {
      try {
        const heartbeat = JSON.parse(readFileSync(heartbeatFile, "utf8"));
        const age = Date.now() - heartbeat.ts;
        console.log("✅ Heartbeat file exists (age: " + age + "ms)");
        console.log("   Content:", heartbeat);
      } catch {
        console.log("⚠️  Heartbeat file exists but invalid JSON");
      }
    } else {
      console.log("❌ No heartbeat file found");
    }

  } finally {
    // Cleanup
    console.log("\n8. Stopping bridge...");
    bridge.stopMonitoring();
    await bridge.stop();
    console.log("✅ Bridge stopped");
  }

  console.log("\n🎉 Test completed!");
}

// Run test
testNewArchitecture().catch(console.error);