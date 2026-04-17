#!/usr/bin/env bun
/**
 * PT DYNAMIC PROBER V5 - "THE SMART ORCHESTRATOR"
 * - Monitorea la salud del bridge en tiempo real
 * - Pausa activa si la cola supera el umbral de seguridad
 * - Limpieza automática de estados huérfanos
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DNA_PATH = join(process.cwd(), "docs", "pt-dna-v4.json");
const STATE_PATH = join(process.cwd(), "docs", "probing-state.json");
const RESULTS_PATH = join(process.cwd(), "docs", "probe-results-v4.json");

const colors = {
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`
};

const BLACKLIST = [
  "isAutoCablingDisabled", "isBottomToolbarShown", "isCableInfoPopup", 
  "isChallenge_PDUInfo", "isCliTabHidden", "isConfigTabHidden",
  "registerEvent", "unregisterEvent", "registerDelegate", "unregisterDelegate",
  "exit", "reboot", "stop", "clearLog"
];

async function runProbing() {
  console.log(colors.bold(colors.blue("\n🚀 Iniciando Motor de Probing Dinámico V5...")));
  
  const dna = JSON.parse(readFileSync(DNA_PATH, "utf-8"));
  let state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, "utf-8")) : {
    lastGlobalIndex: 0,
    lastDeviceIndex: 0,
    lastMethodName: "",
    methodsProbed: 0
  };

  const controller = createDefaultPTController();
  const results = existsSync(RESULTS_PATH) ? JSON.parse(readFileSync(RESULTS_PATH, "utf-8")) : { raw: [] };

  function save() {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  }

  async function waitForQueue(threshold = 20) {
    let status = controller.getBridgeStatus();
    let pending = (status.queuedCount || 0) + (status.inFlightCount || 0);
    
    if (pending > threshold) {
      process.stdout.write(colors.yellow(`\n[WAIT] Cola en ${pending}. Esperando a que PT procese... `));
      while (pending > 5) {
        await new Promise(r => setTimeout(r, 1000));
        status = controller.getBridgeStatus();
        pending = (status.queuedCount || 0) + (status.inFlightCount || 0);
      }
      console.log(colors.green("CONTINUANDO"));
    }
  }

  try {
    await controller.start();
    console.log(colors.green("✅ Conexión establecida."));

    // 1. GLOBALES
    const globals = Object.entries(dna.globals);
    for (let i = state.lastGlobalIndex; i < globals.length; i++) {
      const [name, info]: [string, any] = globals[i];
      state.lastGlobalIndex = i;
      
      console.log(colors.bold(`\n🌐 Global: ${name} (${i+1}/${globals.length})`));
      const methods = Object.keys(info.methods || {});
      
      for (const method of methods) {
        if (state.lastMethodName && state.lastMethodName === method) {
            state.lastMethodName = "";
            continue;
        }
        if (BLACKLIST.includes(method)) continue;

        await waitForQueue(); // <--- CONTROL DE FLUJO ACTIVO

        process.stdout.write(colors.gray(`  Probing ${method}... `));
        try {
          const path = name === "ipc" ? "ipc" : name;
          const res = await controller.deepInspect(path, method, []);
          
          if (res.ok) {
            const inferred = res.result && res.result.__pt_object__ ? `PTObject<${res.result.className}>` : typeof res.result;
            console.log(colors.green(`OK (${inferred})`));
            results.raw.push({ path, method, type: inferred, result: res.result });
            state.methodsProbed++;
          } else {
            console.log(colors.yellow(`FAIL`));
          }
        } catch (e: any) {
          console.log(colors.red(`ERR`));
        }
        state.lastMethodName = method;
        save();
      }
    }

    // 2. DISPOSITIVOS
    for (let i = state.lastDeviceIndex; i < dna.devices.length; i++) {
      const dev = dna.devices[i];
      state.lastDeviceIndex = i;

      console.log(colors.bold(`\n💻 Dispositivo: ${dev.className} [${i}] (${i+1}/${dna.devices.length})`));
      const path = `network.getDeviceAt(${i})`;
      const methods = Object.keys(dev.methods || {});

      for (const method of methods) {
        if (state.lastMethodName && state.lastMethodName === method) {
            state.lastMethodName = "";
            continue;
        }
        if (BLACKLIST.some(k => method.toLowerCase().includes(k.toLowerCase()))) continue;

        await waitForQueue(); // <--- CONTROL DE FLUJO ACTIVO

        process.stdout.write(colors.gray(`  Probing ${dev.className}.${method}... `));
        try {
          const res = await controller.deepInspect(path, method, []);
          if (res.ok) {
            const inferred = res.result && res.result.__pt_object__ ? `PTObject<${res.result.className}>` : typeof res.result;
            console.log(colors.green(`OK (${inferred})`));
            results.raw.push({ class: dev.className, method, type: inferred, result: res.result });
            state.methodsProbed++;
          } else {
            console.log(colors.yellow("FAIL"));
          }
        } catch (e) {
          console.log(colors.red("ERR"));
        }
        state.lastMethodName = method;
        save();
      }
    }

    console.log(colors.bold(colors.green(`\n🏁 PROBING FINALIZADO.`)));

  } catch (error: any) {
    console.error(colors.red(`\n❌ Error: ${error.message}`));
  } finally {
    await controller.stop();
  }
}

runProbing();
