#!/usr/bin/env bun
/**
 * VALIDADOR DE CAPA FÍSICA V2 - INTELIGENTE
 * Detecta puertos caídos y los levanta automáticamente.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  orange: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`
};

async function validateLeds() {
  console.log(colors.bold("\n🔍 Iniciando Verificación de LEDs Físicos..."));
  
  const controller = createDefaultPTController();
  
  try {
    await controller.start();

    const checkAndUp = async (deviceName: string, portName: string) => {
      const path = `network().getDevice('${deviceName}').getPort('${portName}')`;
      process.stdout.write(`Checking ${deviceName} [${portName}] LED... `);
      
      let res = await controller.deepInspect(path, "getLightStatus", []);
      let status = res.ok ? res.result : -1;

      if (status === 0) {
        console.log(colors.red("🔴 OFF (Down). Intentando levantar..."));
        // Inyectar no shutdown
        await controller.deepInspect(`network().getDevice('${deviceName}').getCommandLine()`, "enterCommand", ["interface " + portName]);
        await controller.deepInspect(`network().getDevice('${deviceName}').getCommandLine()`, "enterCommand", ["no shutdown"]);
        
        // Pequeña espera para negociación
        process.stdout.write("  Waiting for negotiation... ");
        await new Promise(r => setTimeout(r, 2000));
        
        res = await controller.deepInspect(path, "getLightStatus", []);
        status = res.ok ? res.result : -1;
      }
      
      let statusStr = "";
      switch(status) {
        case 0: statusStr = colors.red("🔴 STILL OFF"); break;
        case 1: statusStr = colors.green("🟢 UP / GREEN"); break;
        case 2: statusStr = colors.orange("🟠 STP / ORANGE"); break;
        default: statusStr = colors.cyan(`❓ UNKNOWN (${status})`);
      }
      console.log(statusStr);
      return status;
    };

    console.log(colors.cyan("─".repeat(60)));
    const r1Status = await checkAndUp("Router1", "GigabitEthernet0/0");
    const s1Status = await checkAndUp("Switch1", "GigabitEthernet0/1");
    console.log(colors.cyan("─".repeat(60)));

    if (r1Status === 1 && s1Status === 1) {
      console.log(colors.bold(colors.green("\n✅ PRUEBA DE ACEPTACIÓN EXITOSA: Capa Física validada.")));
    } else {
      console.log(colors.bold(colors.orange("\n⚠️ PRUEBA DE ACEPTACIÓN INCOMPLETA: Revise la conexión física en PT.")));
    }

  } catch (error: any) {
    console.error(colors.red(`\n❌ Error de validación: ${error.message}`));
  } finally {
    await controller.stop();
  }
}

validateLeds();
