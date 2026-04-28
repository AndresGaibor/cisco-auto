#!/usr/bin/env bun

import { FileBridgeV2 } from "../../packages/file-bridge/src/file-bridge-v2.js";
import { getSmokePtDevDir } from "./smoke-paths.js";
import { join } from "node:path";

const PT_DEV_DIR = getSmokePtDevDir();

const wirelessModels = [
  // Wireless Routers
  "WRT300N", "WRT54G", "WRT120N", "WRT160N", "WRT610N",
  "E1000", "E2000", "E3000", "E4200",
  "Linksys-E1000", "Linksys-E2000",
  // Access Points
  "AccessPoint-PT", "AP", "access-point",
  "Aironet-1200", "Aironet-1231AG", "Aironet-1242AG",
  "Aironet-2600", "Aironet-3600",
  // Home Gateways
  "Home-Gateway", "HomeRouter", "home-router",
];

async function testWireless() {
  console.log("🔍 Test de dispositivos wireless en PT 9.0.0...\n");
  
  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "wireless-tester",
    maxPendingCommands: 5,
  });
  
  bridge.start();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results: Record<string, boolean> = {};
  
  for (const model of wirelessModels) {
    process.stdout.write(`${model.padEnd(25)}... `);
    
    try {
      const result = await bridge.sendCommandAndWait("addDevice", {
        model: model,
        name: `WL_${model.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 15)}`,
        x: 100 + Math.random() * 50,
        y: 100 + Math.random() * 50,
      }, 3000);
      
      if (result.ok) {
        console.log("✅");
        results[model] = true;
        await bridge.sendCommandAndWait("removeDevice", {
          name: `WL_${model.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 15)}`,
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
  
  console.log(`\n❌ NO FUNCIONAN (${Object.keys(results).length - working.length}):`);
  Object.entries(results).filter(([_, ok]) => !ok).forEach(([model, _]) => console.log(`   - ${model}`));
  
  // Guardar resultados
  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(PT_DEV_DIR, "wireless-test-report.json"), JSON.stringify({
    date: new Date().toISOString(),
    models: { working: working.map(([m]) => m) }
  }, null, 2));
}

testWireless().catch(console.error);
