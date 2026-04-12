#!/usr/bin/env bun

/**
 * Test para verificar qué modelos de switches existen realmente en PT 9.0.0
 */

import { FileBridgeV2 } from "./packages/file-bridge/src/file-bridge-v2.js";

const PT_DEV_DIR = "/Users/andresgaibor/pt-dev";

const switchModelsToTest = [
  // Modelos del catálogo
  "2960-24TT-L",
  "2960-24TC-L", 
  "2950-24",
  "2950T-24",
  "3560-24PS",
  "3650-24PS",
  // Modelos verificados
  "2960-24TT",
  "2960-24TC",
  // Otros posibles
  "2960",
  "3560",
  "3560-24",
  "2950",
];

async function testSwitchModels() {
  console.log("🔍 Probando modelos de switches en PT 9.0.0...\n");
  
  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "switch-tester",
    maxPendingCommands: 10,
  });
  
  bridge.start();
  
  // Esperar a que esté listo
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results: Record<string, boolean> = {};
  
  for (const model of switchModelsToTest) {
    const testName = `Switch ${model}`;
    process.stdout.write(`Testing ${model.padEnd(20)}... `);
    
    try {
      const result = await bridge.sendCommandAndWait("addDevice", {
        model: model,
        name: `SW_${model.replace(/[^a-zA-Z0-9]/g, '_')}`,
        x: 100 + Math.random() * 50,
        y: 100 + Math.random() * 50,
      }, 5000);
      
      if (result.ok) {
        console.log("✅ FUNCIONA");
        results[model] = true;
        
        // Remover el dispositivo después de testear
        await bridge.sendCommandAndWait("removeDevice", {
          name: `SW_${model.replace(/[^a-zA-Z0-9]/g, '_')}`,
        }, 3000);
      } else {
        console.log(`❌ FALLA: ${result.error}`);
        results[model] = false;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${(error as Error).message}`);
      results[model] = false;
    }
    
    // Pequeña pausa entre tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  bridge.stop();
  
  // Resumen
  console.log("\n📊 RESUMEN:");
  console.log("=" .repeat(50));
  
  const working = Object.entries(results).filter(([_, ok]) => ok);
  const notWorking = Object.entries(results).filter(([_, ok]) => !ok);
  
  console.log(`\n✅ FUNCIONAN (${working.length}):`);
  working.forEach(([model, _]) => console.log(`   - ${model}`));
  
  console.log(`\n❌ NO FUNCIONAN (${notWorking.length}):`);
  notWorking.forEach(([model, _]) => console.log(`   - ${model}`));
  
  console.log(`\n📈 Tasa de éxito: ${Math.round(working.length / results.length * 100)}%`);
}

testSwitchModels().catch(console.error);
