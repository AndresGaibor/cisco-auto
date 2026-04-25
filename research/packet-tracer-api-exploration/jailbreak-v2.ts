#!/usr/bin/env bun
/**
 * JAILBREAK EXPERIMENT: PARSER FUZZING
 * Intenta inyectar comandos de sistema en el traductor nativo.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function fuzzParser() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V2: PARSER FUZZING...");

    // Enviar comandos de sistema al parser
    const payloads = [
        "help",
        "system ls",
        "eval 1+1",
        "ipc list",
        "app version"
    ];

    for (const p of payloads) {
        process.stdout.write(`Fuzzing [${p}]... `);
        // Intentamos llamar a _parser como función global (inyectada en deps)
        const res = await controller.deepInspect("ipc", "_parser", [p, {}]);
        if (res.ok) {
            console.log(`✅ RESPUESTA: ${JSON.stringify(res.result)}`);
        } else {
            console.log(`❌ BLOQUEADO`);
        }
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
fuzzParser();
