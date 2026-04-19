#!/usr/bin/env bun
/**
 * SIMULATION ENGINE INSPECTOR
 * Extrae la lista de paquetes en vuelo.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function inspectSim() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n📡 INTERROGANDO AL MOTOR DE SIMULACIÓN...");

    const exploit = `
      (function() {
        try {
            var sim = simulation();
            var eventCount = sim.getEventListCount();
            var events = [];
            for (var i = 0; i < Math.min(eventCount, 10); i++) {
                var event = sim.getEventAt(i);
                events.push({
                    id: i,
                    type: event.getPacket().getProtocolName(),
                    from: event.getSourceDeviceName(),
                    to: event.getDestinationDeviceName()
                });
            }
            return { count: eventCount, samples: events };
        } catch(e) {
            return "SIM_ERROR: " + e;
        }
      })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    
    if (res.ok) {
        console.log(`\n✅ Eventos en la lista de simulación: ${res.result.count}`);
        if (res.result.samples && res.result.samples.length > 0) {
            console.log("--------------------------------------------------");
            res.result.samples.forEach((ev: any) => {
                console.log(`[${ev.type}] ${ev.from} ➔ ${ev.to}`);
            });
            console.log("--------------------------------------------------");
        } else {
            console.log("No hay tráfico detectado en la lista de eventos.");
        }
    } else {
        console.error(`❌ Falló la inspección: ${res.error}`);
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

inspectSim();
