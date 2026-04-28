#!/usr/bin/env bun

/**
 * Test exhaustivo de TODOS los modelos de switches posibles en PT 9.0.0
 */

import { FileBridgeV2 } from "../../packages/file-bridge/src/file-bridge-v2.js";
import { getSmokePtDevDir } from "./smoke-paths.js";
import { join } from "node:path";

const PT_DEV_DIR = getSmokePtDevDir();

// Lista exhaustiva de modelos de switches posibles en PT
const allSwitchModels = [
  // Serie 2950
  "2950-24", "2950-12", "2950T-24", "2950G-12", "2950G-24", "2950G-48", "2950G-8",
  "2950C-24", "2950CX-24",
  
  // Serie 2960
  "2960-24TT", "2960-24TC", "2960-48TT", "2960-48TC",
  "2960-24", "2960-48", "2960-8", "2960-12",
  "2960G-24", "2960G-48", "2960G-8",
  "2960S-24", "2960S-48", "2960S-24PD", "2960S-48PD",
  "2960X-24", "2960X-48", "2960XR-24", "2960XR-48",
  "2960L-24", "2960L-48", "2960L-8", "2960L-12",
  
  // Serie 3560
  "3560-24PS", "3560-48PS", "3560-24TS", "3560-48TS",
  "3560-24", "3560-48", "3560-8", "3560-12",
  "3560G-24PS", "3560G-48PS", "3560G-24TS", "3560G-48TS",
  "3560V2-24PS", "3560V2-48PS",
  
  // Serie 3650
  "3650-24PS", "3650-48PS", "3650-24TS", "3650-48TS",
  "3650-24", "3650-48",
  
  // Serie 3850
  "3850-24", "3850-48", "3850-24S", "3850-48S",
  
  // Otros switches
  "3550-24", "3550-48", "3550-24PWR",
  "3750-24", "3750-48", "3750G-24", "3750G-48",
  "2970-24", "2970-24TS",
  
  // Switches genéricos
  "Switch", "switch", "Generic-Switch",
];

async function testAllSwitches() {
  console.log("🔍 Test exhaustivo de switches en PT 9.0.0...\n");
  console.log(`Probando ${allSwitchModels.length} modelos...\n`);
  
  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "switch-exhaustive-tester",
    maxPendingCommands: 5,
  });
  
  bridge.start();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results: Record<string, boolean> = {};
  let tested = 0;
  
  for (const model of allSwitchModels) {
    tested++;
    process.stdout.write(`[${tested}/${allSwitchModels.length}] ${model.padEnd(25)}... `);
    
    try {
      const result = await bridge.sendCommandAndWait("addDevice", {
        model: model,
        name: `SW_${model.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 20)}`,
        x: 50 + (tested % 20) * 30,
        y: 50 + Math.floor(tested / 20) * 30,
      }, 3000);
      
      if (result.ok) {
        console.log("✅");
        results[model] = true;
        
        // Remover después de test
        await bridge.sendCommandAndWait("removeDevice", {
          name: `SW_${model.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 20)}`,
        }, 2000);
      } else {
        console.log(`❌`);
        results[model] = false;
      }
    } catch (error) {
      console.log(`❌`);
      results[model] = false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  bridge.stop();
  
  // Resumen
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN");
  console.log("=".repeat(80));
  
  const working = Object.entries(results).filter(([_, ok]) => ok);
  const notWorking = Object.entries(results).filter(([_, ok]) => !ok);
  
  console.log(`\n✅ FUNCIONAN (${working.length}):\n`);
  working.forEach(([model, _]) => console.log(`   - ${model}`));
  
  console.log(`\n❌ NO FUNCIONAN (${notWorking.length}):\n`);
  notWorking.forEach(([model, _]) => console.log(`   - ${model}`));
  
  const totalModels = working.length + notWorking.length;
  console.log(`\n📈 Tasa de éxito: ${Math.round(working.length / totalModels * 100)}% (${working.length}/${totalModels})`);
  
  // Guardar resultados
  const reportPath = join(PT_DEV_DIR, "switch-test-report.json");
  const report = {
    date: new Date().toISOString(),
    total: totalModels,
    working: working.length,
    notWorking: notWorking.length,
    models: {
      working: working.map(([m]) => m),
      notWorking: notWorking.map(([m]) => m),
    }
  };
  
  const { writeFileSync } = await import('node:fs');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Reporte guardado en: ${reportPath}`);
}

testAllSwitches().catch(console.error);
