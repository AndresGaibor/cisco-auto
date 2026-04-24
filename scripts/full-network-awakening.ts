#!/usr/bin/env bun
/**
 * FULL NETWORK AWAKENING & TOPOLOGY MAPPING
 * Despierta todas las interfaces y mapea el 100% de los enlaces.
 * Modernizado para usar el motor de terminal robusto.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`
};

async function awakenAndMap() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log(colors.bold("\n🔥 INICIANDO DESPERTAR GLOBAL DE LA RED..."));

    // 1. Obtener lista de dispositivos
    const devices = await controller.listDevices();
    const networkDevices = devices.filter(d => d.type === "router" || d.type === "switch");

    console.log(colors.cyan(`🔍 Detectados ${networkDevices.length} dispositivos de red.`));

    // 2. Despertar interfaces en cada dispositivo usando el motor robusto
    for (const dev of networkDevices) {
        console.log(`⏳ Despertando interfaces en ${dev.name}...`);
        
        // Obtenemos info del hardware para saber qué interfaces tiene
        const info: any = await controller.hardwareInfo(dev.name);
        const portNames = (info.ports || [])
            .map((p: any) => p.name)
            .filter((n: string) => n.includes("Gigabit") || n.includes("Fast"));

        if (portNames.length > 0) {
            const commands = portNames.flatMap((n: string) => [`interface ${n}`, "no shutdown"]);
            await controller.configIos(dev.name, commands);
            console.log(colors.green(`   ✅ ${portNames.length} interfaces levantadas en ${dev.name}.`));
        }
    }

    console.log(colors.cyan("\n⏳ Esperando 12 segundos para convergencia física y STP..."));
    await new Promise(r => setTimeout(r, 12000));

    console.log(colors.bold("🕵️  RECONSTRUYENDO MAPA DE CONECTIVIDAD..."));
    
    // Para el mapa de red seguimos usando un evaluate prolijo ya que es lectura masiva
    const mappingExploit = `
        (function() {
            var net = ipc.network();
            var dCount = net.getDeviceCount();
            var portMap = {};
            
            for(var i=0; i<dCount; i++) {
                var dev = net.getDeviceAt(i);
                var devName = dev.getName();
                var pCount = dev.getPortCount();
                
                for(var j=0; j<pCount; j++) {
                    var p = dev.getPortAt(j);
                    var link = p.getLink();
                    if (link) {
                        var linkId = link.getObjectUuid();
                        if (!portMap[linkId]) portMap[linkId] = [];
                        portMap[linkId].push(devName + ":" + p.getName());
                    }
                }
            }
            
            var links = [];
            for(var id in portMap) {
                if (portMap[id].length === 2) {
                    links.push(portMap[id][0] + " <───> " + portMap[id][1]);
                } else if (portMap[id].length === 1) {
                    links.push(portMap[id][0] + " <───> [CABLE SUELTO]");
                }
            }
            return links.join("|||");
        })()
    `;

    const res = await controller.send("__evaluate", { code: mappingExploit });
    
    if (res && res.length > 0) {
        const list = res.split("|||");
        console.log(colors.green(`\n✨ ¡TOPOLOGÍA RECUPERADA! Encontrados ${list.length} enlaces:\n`));
        console.log(colors.magenta("  " + "─".repeat(60)));
        list.forEach((l: string) => console.log(`  🔗 ${l}`));
        console.log(colors.magenta("  " + "─".repeat(60)));
    } else {
        console.log(colors.yellow("\n⚠️  No se detectaron cables."));
    }

  } catch (error: any) {
    console.error(colors.bold(`\n❌ Error: ${error.message}`));
  } finally {
    await controller.stop();
  }
}

awakenAndMap();