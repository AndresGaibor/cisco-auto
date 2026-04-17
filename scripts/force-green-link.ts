#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`
};

async function forceSetup() {
  const controller = createDefaultPTController();
  const routerName = "Router0";
  const cliPath = `network().getDevice('${routerName}').getCommandLine()`;
  try {
    await controller.start();
    console.log(colors.bold("\n🚀 INICIANDO PROTOCOLO WIZARD BREAKER (V6.1)..."));
    console.log(colors.yellow(`⚔️ Intentando liberar a ${routerName} del Setup Wizard...`));
    let freed = false;
    for (let i = 0; i < 5; i++) {
        const promptRes = await controller.deepInspect(cliPath, "getPrompt", []);
        const prompt = promptRes.result || "";
        if (prompt.includes("[yes/no]")) {
            console.log(colors.cyan("  [!] Detectado Setup Wizard. Enviando 'no'..."));
            await controller.deepInspect(cliPath, "enterCommand", ["no"]);
            await new Promise(r => setTimeout(r, 2000));
        } else if (prompt.includes(">") || prompt.includes("#")) {
            console.log(colors.green("  [✓] Router libre. Prompt estándar detectado."));
            freed = true;
            break;
        } else {
            console.log("  [?] Prompt desconocido, enviando Enter...");
            await controller.deepInspect(cliPath, "enterCommand", [""]);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    if (!freed) return;
    const commands = ["enable", "configure terminal", "interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0", "no shutdown", "end"];
    console.log(colors.yellow("\n⚙️ Inyectando configuración..."));
    for (const cmd of commands) {
      process.stdout.write(`  -> ${cmd}... `);
      const res = await controller.deepInspect(cliPath, "enterCommand", [cmd]);
      await new Promise(r => setTimeout(r, 800));
      console.log(res.ok ? colors.green("SENT") : colors.red("FAIL"));
    }
    console.log(colors.cyan("\n📊 Verificando hardware:"));
    await new Promise(r => setTimeout(r, 3000));
    const led = await controller.deepInspect(`network().getDevice('${routerName}').getPort('GigabitEthernet0/0')`, "getLightStatus", []);
    if (led.result === 1) console.log(colors.bold(colors.green(`\n✅ ¡ÉXITO TOTAL! Link VERDE.`)));
    else console.log(colors.bold(colors.red(`\n❌ Sigue en rojo (Estado: ${led.result}).`)));
  } catch (error: any) {
    console.error(colors.red(`\n💥 Error: ${error.message}`));
  } finally {
    await controller.stop();
  }
}
forceSetup();
