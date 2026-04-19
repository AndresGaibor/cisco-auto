#!/usr/bin/env bun
/**
 * BLAST RADIUS ANALYZER
 * Calcula el impacto de apagar un dispositivo en la red global.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function analyzeBlastRadius() {
  const controller = createDefaultPTController();
  const target = "OMNI-ROUTER-CORE";

  try {
    await controller.start();
    console.log(`\n☢️  ANALIZADOR DE RADIO DE EXPLOSIÓN: ${target}`);

    const exploit = `
        (function() {
            var net = ipc.network();
            var dev = net.getDevice('${target}');
            var ports = dev.getPortCount();
            var affectedIps = [];
            var connections = 0;

            for(var i=0; i<ports; i++) {
                var p = dev.getPortAt(i);
                var link = p.getLink();
                if (link) {
                    connections++;
                    var otherDev = (link.getEndPoint1().getOwnerDevice().getName() === '${target}') 
                        ? link.getEndPoint2().getOwnerDevice().getName() 
                        : link.getEndPoint1().getOwnerDevice().getName();
                    affectedIps.push(p.getIpAddress() + " ➔ " + otherDev);
                }
            }

            return {
                status: dev.getPower() ? "ALIVE" : "DEAD",
                interfaces: ports,
                activeLinks: connections,
                impact: affectedIps
            };
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    const data = res.result;

    console.log("\n📊 INFORME DE IMPACTO:");
    console.log(`- Estado Actual: ${data.status === "ALIVE" ? "\x1b[32mON\x1b[0m" : "\x1b[31mOFF\x1b[0m"}`);
    console.log(`- Enlaces Activos: ${data.activeLinks}`);
    console.log(`- Grado de Criticidad: ${data.activeLinks > 2 ? "\x1b[31mALTA (CORE)\x1b[0m" : "\x1b[33mBAJA (EDGE)\x1b[0m"}`);
    
    console.log("\n🛤️ RUTAS QUE SE PERDERÍAN:");
    data.impact.forEach((route: string) => {
        console.log(`  ❌ ${route}`);
    });

    console.log(`\n⚠️  CONCLUSIÓN: Apagar ${target} desconectará a ${data.activeLinks} vecinos inmediatos.`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

analyzeBlastRadius();
