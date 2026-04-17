#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function physicalSweep() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🚀 INICIANDO BARRIDO FÍSICO DE INTERFACES EN Router0...");

    const interfaces = ["GigabitEthernet0/0", "GigabitEthernet0/1", "GigabitEthernet0/2"];
    
    for (const iface of interfaces) {
      console.log(`\nTesting ${iface}...`);
      const cliPath = "network().getDevice('Router0').getCommandLine()";
      
      await controller.deepInspect(cliPath, "enterCommand", ["configure terminal"]);
      await controller.deepInspect(cliPath, "enterCommand", ["interface " + iface]);
      await controller.deepInspect(cliPath, "enterCommand", ["no shutdown"]);
      await controller.deepInspect(cliPath, "enterCommand", ["end"]);

      console.log("  Waiting for physical carrier (2s)...");
      await new Promise(r => setTimeout(r, 2000));

      const led = await controller.deepInspect(`network().getDevice('Router0').getPort('${iface}')`, "getLightStatus", []);
      console.log(`  LED Status for ${iface}: ${led.result === 1 ? "🟢 GREEN" : "🔴 OFF"}`);

      if (led.result === 1) {
        console.log(`\n✨ ¡ENCONTRADA! La interfaz activa es ${iface}`);
        break;
      }
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
physicalSweep();
