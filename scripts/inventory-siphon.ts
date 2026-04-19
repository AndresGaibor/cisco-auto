#!/usr/bin/env bun
/**
 * THE GREAT INVENTORY SIPHON
 * Bypass de serialización: Extrae el 100% de la red en un solo String.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`
};

async function startSiphon() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log(colors.bold("\n🌪️  INICIANDO SIPHON DE INVENTARIO TOTAL..."));

    // El Exploit: Recorre todo y concatena en texto plano
    const exploit = `
        (function() {
            var net = ipc.network();
            var count = net.getDeviceCount();
            var out = [];
            
            for(var i=0; i<count; i++) {
                var d = net.getDeviceAt(i);
                var name = d.getName();
                var className = d.getClassName();
                var type = d.getType();
                var pCount = d.getPortCount();
                
                // Extraer IP del primer puerto si existe
                var ip = "N/A";
                var led = "0";
                if (pCount > 0) {
                    var p = d.getPortAt(0);
                    try { ip = p.getIpAddress(); } catch(e) {}
                    try { led = p.getLightStatus(); } catch(e) {}
                }
                
                // Formato: NAME:::CLASS:::TYPE:::IP:::LED
                out.push(name + ":::" + className + ":::" + type + ":::" + ip + ":::" + led);
            }
            // Unimos todo con un delimitador de registro |||
            return out.join("|||");
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    
    if (res.ok && res.result) {
        const records = res.result.split("|||");
        console.log(colors.green(`✅ Sifonado exitoso: ${records.length} dispositivos capturados.\n`));
        
        console.log(colors.bold("  " + "NOMBRE".padEnd(20) + "CLASE".padEnd(15) + "IP".padEnd(15) + "LED"));
        console.log(colors.gray("  " + "─".repeat(55)));

        records.forEach((r: string) => {
            const [name, cls, type, ip, led] = r.split(":::");
            let ledIcon = led === "1" ? colors.green("🟢") : (led === "2" ? colors.yellow("🟠") : "🔴");
            
            console.log(`  ${name.padEnd(20)} ${cls.padEnd(15)} ${ip.padEnd(15)} ${ledIcon}`);
        });
        console.log("");
    } else {
        console.error("❌ El siphon no devolvió datos.");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

startSiphon();
