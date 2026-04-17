#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function conquer() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🔥 ATAQUE SIMULTÁNEO A AMBOS LADOS DEL ENLACE...");

    const r1Cmd = "network().getDevice('Router0').getCommandLine()";
    const s1Cmd = "network().getDevice('Switch0').getCommandLine()";

    console.log("➡️ Router0: Levantando Gig0/0...");
    await controller.deepInspect(r1Cmd, "enterCommand", ["enable", "conf t", "interface GigabitEthernet0/0", "no shutdown", "end"]);

    console.log("➡️ Switch0: Levantando Gig0/1...");
    await controller.deepInspect(s1Cmd, "enterCommand", ["enable", "conf t", "interface GigabitEthernet0/1", "no shutdown", "switchport mode access", "end"]);

    console.log("\n⏳ Esperando convergencia (STP puede tardar 30s)...");
    for(let i=0; i<6; i++) {
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, 5000));
        
        const led = await controller.deepInspect("network().getDevice('Router0').getPort('GigabitEthernet0/0')", "getLightStatus", []);
        if (led.result === 1) {
            console.log("\n✅ ¡LOGRADO! El link está VERDE.");
            break;
        } else if (led.result === 2) {
            console.log("\n🟠 Link en ÁMBAR (STP Negociando).");
        }
    }

    const finalLed = await controller.deepInspect("network().getDevice('Router0').getPort('GigabitEthernet0/0')", "getLightStatus", []);
    console.log(`\nEstado LED final: ${finalLed.result}`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
conquer();
