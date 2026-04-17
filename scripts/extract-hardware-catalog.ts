#!/usr/bin/env bun
/**
 * PT HARDWARE CATAOLOG EXTRACOR
 * Extrae todos los modelos y tipos de cables soportados por el motor.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function extractHardware() {
  const controller = createDefaultPTController();
  const hf = "hardwareFactory()";
  
  try {
    await controller.start();
    console.log("\n🏗️  EXTRAYENDO CATÁLOGO MAESTRO DE HARDWARE...");

    // PT usa IDs numéricos. Vamos a probar un barrido de IDs para ver qué modelos devuelve.
    const models = [];
    console.log("Sondeando IDs de dispositivos (0-100)...");
    
    // Basado en el dump, buscaremos métodos que nos den información del catálogo
    const catalog = await controller.deepInspect(hf, "getClassName", []);
    console.log(`Clase detectada: ${catalog.result}`);

    // Vamos a intentar obtener los tipos de cable conocidos
    const cables = [
        { id: 8100, name: "Copper Straight" },
        { id: 8101, name: "Copper Cross" },
        { id: 8102, name: "Fiber" },
        { id: 8103, name: "Serial" },
        { id: 8104, name: "Console" }
    ];

    console.log("\n🔌 Verificando tipos de cables en el motor...");
    for(const c of cables) {
        const res = await controller.deepInspect(hf, "getCableType", [c.name]);
        console.log(`  - ${c.name} (ID: ${c.id}) -> Motor responde: ${JSON.stringify(res.result)}`);
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
extractHardware();
