#!/usr/bin/env bun
/**
 * EVENT GENOME EXTRACTOR
 * El "Electrograma" de Packet Tracer. Captura todas las señales del motor.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function extractEvents() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🧠 CONECTANDO ELECTRODOS AL SISTEMA NERVIOSO DE PT...");

    // Lista de eventos sospechosos para capturar (según el dump)
    const eventTypes = [
        "deviceAdded", "deviceRemoved", "linkAdded", "linkRemoved",
        "packetReceived", "packetSent", "packetDropped",
        "simulationStarted", "simulationStopped", "simulationStep",
        "commandEntered", "modeChanged"
    ];

    const exploit = `
      (function() {
        var results = [];
        var scope = ipc;
        
        // Función de captura universal
        var handler = function(name) {
            return function() {
                var argsStr = "";
                for(var i=0; i<arguments.length; i++) {
                    argsStr += (i>0 ? ", " : "") + (arguments[i] && arguments[i].getName ? arguments[i].getName() : typeof arguments[i]);
                }
                dprint("[EVENT_GENOME] " + name + " fired with: [" + argsStr + "]");
            };
        };

        // Suscribir a todo lo que podamos
        var events = ${JSON.stringify(eventTypes)};
        for(var i=0; i<events.length; i++) {
            try {
                scope.registerEvent(events[i], scope, handler(events[i]));
            } catch(e) {}
        }
        return "ELECTRODES_ACTIVE";
      })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    console.log(`\x1b[32m✅ ${res.result}\x1b[0m`);
    console.log("\n📡 ESCUCHANDO EN TIEMPO REAL...");
    console.log("\x1b[33m💡 ACCIÓN: Mueve un equipo, borra un cable o lanza un ping en PT.\x1b[0m");
    console.log("Mira el 'Activity Log' de Packet Tracer para ver el genoma de eventos.");

    // Mantener el proceso vivo para capturar
    await new Promise(r => setTimeout(r, 60000));

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

extractEvents();
