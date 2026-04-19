#!/usr/bin/env bun
/**
 * FULL NETWORK AWAKENING & TOPOLOGY MAPPING
 * Despierta todas las interfaces y mapea el 100% de los cables por UUID.
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

    const awakeningExploit = `
        (function() {
            var net = ipc.network();
            var dCount = net.getDeviceCount();
            var awakened = 0;
            
            for(var i=0; i<dCount; i++) {
                var dev = net.getDeviceAt(i);
                var cls = dev.getClassName();
                
                if (cls === "Router" || cls === "Switch") {
                    var cli = dev.getCommandLine();
                    // Romper wizard y entrar a config
                    cli.enterCommand(""); 
                    cli.enterCommand("no");
                    cli.enterCommand("enable");
                    cli.enterCommand("conf t");
                    
                    // Barrido de las primeras 10 interfaces posibles
                    var ports = dev.getPortCount();
                    for(var j=0; j<Math.min(ports, 10); j++) {
                        var p = dev.getPortAt(j);
                        var pName = p.getName();
                        if (pName.indexOf("Gigabit") !== -1 || pName.indexOf("Fast") !== -1) {
                            cli.enterCommand("interface " + pName);
                            cli.enterCommand("no shutdown");
                        }
                    }
                    cli.enterCommand("end");
                    awakened++;
                }
            }
            return awakened;
        })()
    `;

    const count = await controller.send("__evaluate", { code: awakeningExploit });
    console.log(colors.green(`✅ ${count.result} equipos procesados y despertados.`));

    console.log(colors.cyan("\n⏳ Esperando 12 segundos para convergencia física y STP..."));
    await new Promise(r => setTimeout(r, 12000));

    console.log(colors.bold("🕵️  RECONSTRUYENDO MAPA DE CABLES POR UUID..."));
    
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
                } else {
                    links.push(portMap[id][0] + " <───> [PENDING/SINGLE]");
                }
            }
            return links.join("|||");
        })()
    `;

    const res = await controller.send("__evaluate", { code: mappingExploit });
    
    if (res.ok && res.result) {
        const list = res.result.split("|||");
        console.log(colors.green(`\n✨ ¡TOPOLOGÍA FINAL HACKEADA! Encontrados ${list.length} enlaces:\n`));
        console.log(colors.magenta("  " + "─".repeat(60)));
        list.forEach((l: string) => console.log(`  🔗 ${l}`));
        console.log(colors.magenta("  " + "─".repeat(60)));
    } else {
        console.log(colors.yellow("\n⚠️  No se detectaron cables adicionales. Verifique si los puertos están cableados en PT."));
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

awakenAndMap();
