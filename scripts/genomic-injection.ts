#!/usr/bin/env bun
/**
 * GENOMIC INJECTION EXPLOIT
 * Modifica el ADN (XML) de un dispositivo e intenta re-inyectarlo.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";
import { readFileSync } from "fs";

async function injectGenoma() {
  const controller = createDefaultPTController();
  const routerName = "OMNI-ROUTER-CORE";

  try {
    await controller.start();
    console.log(`\n💉 INICIANDO INYECCIÓN GENÓMICA EN: ${routerName}...`);

    // 1. Leer el XML original que extrajimos antes
    let xml = readFileSync(`docs/device_${routerName}_full.xml`, "utf-8");

    // 2. Realizar la mutación: Cambiaremos el nombre interno en el XML
    const newName = "HACKED-BY-GENOMA";
    console.log(`🧬 Mutando ADN: ${routerName} ➔ ${newName}...`);
    const mutatedXml = xml.replace(`<NAME translate="true">${routerName}</NAME>`, `<NAME translate="true">${newName}</NAME>`);

    // 3. Inyectar el ADN mutado
    const exploit = `
        (function() {
            try {
                var dev = ipc.network().getDevice('${routerName}');
                // deserializeFromXml es el método de re-hidratación
                dev.deserializeFromXml('${mutatedXml.replace(/\n/g, "").replace(/'/g, "\\'")}');
                return "INJECTION_SUCCESS";
            } catch(e) { return "INJECTION_FAILED: " + e; }
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    console.log(`\x1b[32m✅ Resultado del motor: ${res.result}\x1b[0m`);
    
    // 4. Verificar si el nombre cambió en la UI
    const finalName = await controller.send("__evaluate", { code: "ipc.network().getDeviceAt(0).getName()" });
    console.log(`\n📊 Nombre actual en PT: ${finalName.result}`);

    if (finalName.result === newName) {
        console.log("\x1b[1m\x1b[32m\n✨ ¡JAILBREAK GENÓMICO LOGRADO! El hardware ha mutado exitosamente.\x1b[0m");
    } else {
        console.log("\x1b[33m\n⚠️ La inyección fue aceptada pero el motor visual no refrescó el nombre.\x1b[0m");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

injectGenoma();
