#!/usr/bin/env bun
/**
 * TOPOLOGY JAILBREAK V2: DISTRIBUTED RECONSTRUCTION
 * Reconstruye el mapa de cables cruzando el XML de cada dispositivo.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function distributedJailbreak() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V2: RECONSTRUCCIÓN DISTRIBUIDA...");

    const exploit = `
        (function() {
            var net = ipc.network();
            var dCount = net.getDeviceCount();
            var portMap = {}; // uuid_puerto -> info
            
            for(var i=0; i<dCount; i++) {
                var dev = net.getDeviceAt(i);
                var xml = dev.serializeToXml();
                var devName = dev.getName();
                
                // Buscamos los puertos en el XML crudo
                // Cada puerto tiene su propia MAC o UUID y a veces el ID del link
                // Usamos una técnica de mapeo por BIA/MAC
                var ports = dev.getPortCount();
                for(var j=0; j<ports; j++) {
                    var p = dev.getPortAt(j);
                    var link = p.getLink();
                    if (link) {
                        // Si el link existe pero es opaco, intentamos usar su UUID
                        var linkId = link.getObjectUuid();
                        if (!portMap[linkId]) portMap[linkId] = [];
                        portMap[linkId].push(devName + ":" + p.getName());
                    }
                }
            }
            
            // Reconstruir parejas por ID de enlace
            var finalLinks = [];
            for(var id in portMap) {
                if (portMap[id].length === 2) {
                    finalLinks.push(portMap[id][0] + " <───> " + portMap[id][1]);
                } else if (portMap[id].length === 1) {
                    finalLinks.push(portMap[id][0] + " <───> [UNKNOWN/WIRELESS]");
                }
            }
            return finalLinks.join("|||");
        })()
    `;

    console.log("🧬 Sifoneando ADN de cada equipo y cruzando IDs de enlace...");
    const res = await controller.send("__evaluate", { code: exploit });
    
    if (res.ok && res.result) {
        const list = res.result.split("|||");
        console.log(`\n✅ ¡MAPA DE CONECTIVIDAD HACKEADO! (${list.length} cables)`);
        console.log("--------------------------------------------------");
        list.forEach((l: string) => console.log(`  🔗 ${l}`));
        console.log("--------------------------------------------------");
    } else {
        console.log("\n⚠️  No se pudieron reconstruir los enlaces. Cisco ha blindado los UUIDs de conexión.");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

distributedJailbreak();
