#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function verifyMethods() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🧪 VERIFICANDO MÉTODOS OCULTOS DE PORT...");

    const portPath = "network().getDevice('Router0').getPortAt(0)";
    
    // Lista de sospechosos habituales según el dump
    const candidates = [
        "getIpAddress",
        "getSubnetMask",
        "getMacAddress",
        "getLightStatus",
        "isPortUp",
        "getLink",
        "getDuplex",
        "getSpeed",
        "getType"
    ];

    for (const m of candidates) {
        process.stdout.write(`Probando ${m}... `);
        const res = await controller.deepInspect(portPath, m, []);
        if (res.ok) {
            console.log(`✅ RESPUESTA: ${JSON.stringify(res.result)}`);
        } else {
            console.log(`❌ NO DISPONIBLE`);
        }
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
verifyMethods();
