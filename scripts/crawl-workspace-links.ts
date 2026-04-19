#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function deepRefreshScan() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🕸️  FORZANDO REFRESCO DE MEMORIA Y ESCANEO...");

    const exploit = `
        (function() {
            // Intentamos obtener una instancia fresca de Network
            var net = ipc.network();
            var dCount = net.getDeviceCount();
            var connections = [];
            
            for(var i=0; i<dCount; i++) {
                var dev = net.getDeviceAt(i);
                var pCount = dev.getPortCount();
                
                for(var j=0; j<pCount; j++) {
                    var port = dev.getPortAt(j);
                    var link = port.getLink();
                    
                    if (link) {
                        try {
                            var ep1 = link.getEndPoint1();
                            var ep2 = link.getEndPoint2();
                            var pair = ep1.getOwnerDevice().getName() + ":" + ep1.getName() + " <───> " + 
                                       ep2.getOwnerDevice().getName() + ":" + ep2.getName();
                            
                            if (connections.indexOf(pair) === -1) {
                                var rev = ep2.getOwnerDevice().getName() + ":" + ep2.getName() + " <───> " + ep1.getOwnerDevice().getName() + ":" + ep1.getName();
                                if (connections.indexOf(rev) === -1) connections.push(pair);
                            }
                        } catch(e) {
                            connections.push("LINK_OPAQUE_AT_" + dev.getName() + ":" + port.getName());
                        }
                    }
                }
            }
            return connections.length > 0 ? connections.join("|||") : "EMPTY_MEMORY";
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    
    if (res.ok && res.result !== "EMPTY_MEMORY") {
        const list = res.result.split("|||");
        console.log(`\n✅ ENLACES DETECTADOS TRAS REFRESCO: ${list.length}`);
        console.log("--------------------------------------------------");
        list.forEach((l: string) => console.log(`  🔗 ${l}`));
        console.log("--------------------------------------------------");
    } else {
        console.log("\n⚠️  La memoria de la API sigue vacía.");
        console.log("\x1b[33m💡 RECOMENDACIÓN: Presiona 'Stop' y 'Run' en el script de PT para forzar el reinicio del motor.\x1b[0m");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
deepRefreshScan();
