#!/usr/bin/env bun

import { FileBridgeV2 } from "../../packages/file-bridge/src/file-bridge-v2.js";
import { getSmokePtDevDir } from "./smoke-paths.js";
import { join } from "node:path";

const PT_DEV_DIR = getSmokePtDevDir();

const endDevices = [
  // PCs
  "PC-PT", "PC", "pc", "Desktop-PT", "desktop",
  "Tablet-PT", "tablet", "iPad", "Smartphone-PT", "smartphone",
  // Laptops
  "Laptop-PT", "Laptop", "laptop", "notebook",
  // Servers
  "Server-PT", "Server", "server", "rack-server",
  // Printers
  "Printer-PT", "Printer", "printer",
  // Phones
  "IP-Phone-PT", "IP-Phone", "ip-phone", "7960", "7960G",
  // IoT
  "IoT-Device", "iot", "smart-device",
  // Cloud
  "Cloud-PT", "Cloud", "cloud", "Internet", "internet",
  // Hubs
  "Hub", "hub", "Hub-PT",
  // Modems
  "Modem", "modem", "Cable-Modem",
];

async function testEndDevices() {
  console.log("🔍 Test de end devices en PT 9.0.0...\n");
  
  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "end-device-tester",
    maxPendingCommands: 5,
  });
  
  bridge.start();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results: Record<string, boolean> = {};
  
  for (const model of endDevices) {
    process.stdout.write(`${model.padEnd(25)}... `);
    
    try {
      const result = await bridge.sendCommandAndWait("addDevice", {
        model: model,
        name: `ED_${model.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 15)}`,
        x: 100 + Math.random() * 50,
        y: 100 + Math.random() * 50,
      }, 3000);
      
      if (result.ok) {
        console.log("✅");
        results[model] = true;
        await bridge.sendCommandAndWait("removeDevice", {
          name: `ED_${model.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 15)}`,
        }, 2000);
      } else {
        console.log("❌");
        results[model] = false;
      }
    } catch (error) {
      console.log("❌");
      results[model] = false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  bridge.stop();
  
  console.log("\n📊 RESUMEN:");
  const working = Object.entries(results).filter(([_, ok]) => ok);
  console.log(`\n✅ FUNCIONAN (${working.length}):`);
  working.forEach(([model, _]) => console.log(`   - ${model}`));
  
  // Guardar resultados
  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(PT_DEV_DIR, "end-devices-test-report.json"), JSON.stringify({
    date: new Date().toISOString(),
    models: { working: working.map(([m]) => m) }
  }, null, 2));
}

testEndDevices().catch(console.error);
