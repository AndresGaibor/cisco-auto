#!/usr/bin/env bun
/**
 * Test script para verificar las funcionalidades de pt-control
 * Usage: bun run scripts/test-bridge.ts <test>
 * 
 * Tests disponibles:
 *   - list-devices    : Lista dispositivos en PT
 *   - add-device     : Crea un router
 *   - move-device    : Mueve un dispositivo
 *   - add-link       : Conecta dos dispositivos
 *   - snapshot       : Obtiene snapshot de topología
 *   - all            : Ejecuta todos los tests
 */

import { FileBridgeV2 } from "@cisco-auto/file-bridge";

const DEV_DIR = process.env.PT_DEV_DIR || `${process.env.HOME}/pt-dev`;

interface TestResult {
  test: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
}

async function runTest(
  name: string,
  fn: (bridge: FileBridgeV2) => Promise<unknown>
): Promise<TestResult> {
  const start = Date.now();
  const bridge = new FileBridgeV2({ root: DEV_DIR });
  
  try {
    bridge.start();
    await new Promise(r => setTimeout(r, 100)); // Esperar a que PT procese
    
    const result = await fn(bridge);
    return {
      test: name,
      success: true,
      result,
      duration: Date.now() - start,
    };
  } catch (err) {
    return {
      test: name,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      duration: Date.now() - start,
    };
  } finally {
    await bridge.stop();
  }
}

async function testListDevices(bridge: FileBridgeV2) {
  const result = await bridge.sendCommandAndWait(
    "listDevices",
    {},
    5000
  );
  return result.value;
}

async function testAddDevice(bridge: FileBridgeV2) {
  const result = await bridge.sendCommandAndWait(
    "addDevice",
    { name: "TestRouter", model: "2911" },
    10000
  );
  return result.value;
}

async function testMoveDevice(bridge: FileBridgeV2) {
  // Primero crear el dispositivo
  await bridge.sendCommandAndWait(
    "addDevice",
    { name: "MoveTestRouter", model: "2911" },
    10000
  );
  
  // Luego moverlo
  const result = await bridge.sendCommandAndWait(
    "moveDevice",
    { name: "MoveTestRouter", x: 200, y: 150 },
    5000
  );
  return result.value;
}

async function testSnapshot(bridge: FileBridgeV2) {
  const result = await bridge.sendCommandAndWait(
    "snapshot",
    {},
    10000
  );
  return result.value;
}

async function testAddLink(bridge: FileBridgeV2) {
  // Crear dos dispositivos
  await bridge.sendCommandAndWait(
    "addDevice",
    { name: "LinkRouter1", model: "2911" },
    10000
  );
  await bridge.sendCommandAndWait(
    "addDevice",
    { name: "LinkSwitch1", model: "2960-24TT-L" },
    10000
  );
  
  // Conectarlos
  const result = await bridge.sendCommandAndWait(
    "addLink",
    { device1: "LinkRouter1", port1: "GigabitEthernet0/0", device2: "LinkSwitch1", port2: "GigabitEthernet0/1" },
    10000
  );
  return result.value;
}

async function main() {
  const args = process.argv.slice(2);
  const testName = args[0] || "all";
  
  console.log("═══════════════════════════════════════════");
  console.log("       PT Control - Test Suite");
  console.log("═══════════════════════════════════════════");
  console.log(`PT Dev Dir: ${DEV_DIR}`);
  console.log("");
  
  const tests: Record<string, (bridge: FileBridgeV2) => Promise<unknown>> = {
    "list-devices": testListDevices,
    "add-device": testAddDevice,
    "move-device": testMoveDevice,
    "snapshot": testSnapshot,
    "add-link": testAddLink,
  };
  
  if (testName === "all") {
    const results: TestResult[] = [];
    
    for (const [name, fn] of Object.entries(tests)) {
      console.log(`▶ Ejecutando: ${name}...`);
      const result = await runTest(name, fn);
      results.push(result);
      
      if (result.success) {
        console.log(`  ✅ Éxito (${result.duration}ms)`);
        console.log(`  Resultado: ${JSON.stringify(result.result).slice(0, 200)}`);
      } else {
        console.log(`  ❌ Error (${result.duration}ms)`);
        console.log(`  Error: ${result.error}`);
      }
      console.log("");
      
      // Esperar entre tests
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Resumen
    console.log("═══════════════════════════════════════════");
    console.log("           Resumen de Tests");
    console.log("═══════════════════════════════════════════");
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total: ${results.length}`);
    console.log(`✅ Pasados: ${passed}`);
    console.log(`❌ Fallados: ${failed}`);
    
    if (failed > 0) {
      console.log("\nTests fallados:");
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.test}: ${r.error}`);
      });
    }
    
  } else if (tests[testName]) {
    console.log(`▶ Ejecutando: ${testName}...`);
    const result = await runTest(testName, tests[testName]);
    
    if (result.success) {
      console.log(`✅ Éxito (${result.duration}ms)`);
      console.log("Resultado:");
      console.log(JSON.stringify(result.result, null, 2));
    } else {
      console.log(`❌ Error (${result.duration}ms)`);
      console.log(`Error: ${result.error}`);
    }
  } else {
    console.log(`Test desconocido: ${testName}`);
    console.log("Tests disponibles:");
    Object.keys(tests).forEach(t => console.log(`  - ${t}`));
  }
}

main().catch(console.error);
