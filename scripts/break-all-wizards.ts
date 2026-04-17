#!/usr/bin/env bun
/**
 * WIZARD BREAKER UNIVERSAL
 * Libera todos los routers del escenario del Initial Configuration Dialog.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function breakWizards() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n⚔️ INICIANDO BARRIDO DE LIBERACIÓN DE ROUTERS...");

    const countRes = await controller.deepInspect("network()", "getDeviceCount", []);
    const count = countRes.result;

    for (let i = 0; i < count; i++) {
      const devRes = await controller.deepInspect(`network().getDeviceAt(${i})`, "getName", []);
      const classNameRes = await controller.deepInspect(`network().getDeviceAt(${i})`, "getClassName", []);
      const name = devRes.result;
      const className = classNameRes.result;

      if (className === "Router") {
        process.stdout.write(`🔓 Liberando ${name}... `);
        const cli = `network().getDevice('${name}').getCommandLine()`;
        
        // Estrategia: Enviar "no" y luego varios Enters
        await controller.deepInspect(cli, "enterCommand", ["no"]);
        await new Promise(r => setTimeout(r, 1000));
        await controller.deepInspect(cli, "enterCommand", [""]);
        await controller.deepInspect(cli, "enterCommand", [""]);
        
        console.log("¡Hecho!");
      }
    }

    console.log("\n🚀 Ahora configurando el enlace principal Router0 <-> Switch0...");
    const r0Cli = "network().getDevice('Router0').getCommandLine();";
    const s0Cli = "network().getDevice('Switch0').getCommandLine();";

    // Router0: Gig0/0 UP
    await controller.deepInspect(`network().getDevice('Router0').getCommandLine()`, "enterCommand", ["enable"]);
    await controller.deepInspect(`network().getDevice('Router0').getCommandLine()`, "enterCommand", ["conf t"]);
    await controller.deepInspect(`network().getDevice('Router0').getCommandLine()`, "enterCommand", ["interface GigabitEthernet0/0"]);
    await controller.deepInspect(`network().getDevice('Router0').getCommandLine()`, "enterCommand", ["no shutdown"]);
    await controller.deepInspect(`network().getDevice('Router0').getCommandLine()`, "enterCommand", ["end"]);

    // Switch0: Gig0/1 UP
    await controller.deepInspect(`network().getDevice('Switch0').getCommandLine()`, "enterCommand", ["enable"]);
    await controller.deepInspect(`network().getDevice('Switch0').getCommandLine()`, "enterCommand", ["conf t"]);
    await controller.deepInspect(`network().getDevice('Switch0').getCommandLine()`, "enterCommand", ["interface GigabitEthernet0/1"]);
    await controller.deepInspect(`network().getDevice('Switch0').getCommandLine()`, "enterCommand", ["no shutdown"]);
    await controller.deepInspect(`network().getDevice('Switch0').getCommandLine()`, "enterCommand", ["end"]);

    console.log("\n✅ Comandos enviados. El link debería converger a VERDE en 30s.");

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

breakWizards();
