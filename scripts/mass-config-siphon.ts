#!/usr/bin/env bun
/**
 * MASS CONFIG SIPHON
 * Extrae todas las configuraciones IOS de la red usando el bypass de AssessmentModel.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function siphonConfigs() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🌪️  SIPHON DE CONFIGURACIONES MASIVO...");

    const exploit = `
        (function() {
            var net = ipc.network();
            var count = net.getDeviceCount();
            var configs = [];
            
            for(var i=0; i<count; i++) {
                var name = net.getDeviceAt(i).getName();
                try {
                    // Bypass: Usamos el AssessmentModel para leer configs sin tocar la consola
                    var cfg = AssessmentModel.getRunningConfig(name);
                    if (cfg) {
                        configs.push(name + ":::" + cfg.substring(0, 100).replace(/\\n/g, " "));
                    }
                } catch(e) {
                    configs.push(name + ":::FAILED");
                }
            }
            return configs.join("|||");
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    
    if (res.ok && res.result) {
        console.log("\n📄 RESUMEN DE CONFIGURACIONES:");
        console.log("--------------------------------------------------");
        res.result.split("|||").forEach((r: string) => {
            const [name, snippet] = r.split(":::");
            console.log(`  🔹 \x1b[36m${name.padEnd(20)}\x1b[0m: ${snippet}...`);
        });
        console.log("--------------------------------------------------");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

siphonConfigs();
