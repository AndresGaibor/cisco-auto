#!/usr/bin/env bun
/**
 * DHCP SYNC VALIDATOR
 * Configura DHCP por CLI y valida su existencia por IPC.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`
};

async function dhcpExperiment() {
  const controller = createDefaultPTController();
  const routerName = "Router0";
  const cliPath = `network().getDevice('${routerName}').getCommandLine()`;
  const dhcpPath = `network().getDevice('${routerName}').getProcess('DhcpServerMainProcess')`;

  try {
    await controller.start();
    console.log(colors.bold("\n🧪 EXPERIMENTO: SINCRONIZACIÓN CLI -> IPC (DHCP)"));

    // 1. CONFIGURAR POR CLI
    const dhcpCommands = [
        "enable",
        "configure terminal",
        "ip dhcp pool LAN-POOL",
        "network 192.168.1.0 255.255.255.0",
        "default-router 192.168.1.1",
        "dns-server 8.8.8.8",
        "end"
    ];

    console.log(colors.yellow(`\n⚙️ Inyectando Pool DHCP en ${routerName}...`));
    for(const cmd of dhcpCommands) {
        process.stdout.write(`  -> ${cmd}... `);
        await controller.deepInspect(cliPath, "enterCommand", [cmd]);
        await new Promise(r => setTimeout(r, 600));
        console.log(colors.green("OK"));
    }

    // 2. VALIDAR POR IPC (OMNISCIENCIA)
    console.log(colors.cyan("\n🔍 Interrogando al objeto 'DhcpServerMainProcess'..."));
    await new Promise(r => setTimeout(r, 2000)); // Espera de sincronización

    const poolCount = await controller.deepInspect(dhcpPath, "getPoolCount", []);
    
    if (poolCount.ok) {
        console.log(colors.bold.green(`\n✅ CONTEO DE POOLS DETECTADO POR IPC: ${poolCount.result}`));
        if (poolCount.result > 0) {
            const poolInfo = await controller.deepInspect(dhcpPath, "getPoolAt", [0]);
            console.log(`Datos del Pool [0]: ${JSON.stringify(poolInfo.result)}`);
        }
    } else {
        console.log(colors.red(`\n❌ No se pudo acceder al proceso DHCP por IPC: ${poolCount.error}`));
        console.log(colors.gray("Nota: Es probable que los Routers bloqueen el acceso IPC a procesos configurados por CLI."));
    }

    // 3. VERIFICACIÓN DE LED (DEBERÍA ESTAR VERDE YA)
    const led = await controller.deepInspect(`network().getDevice('${routerName}').getPort('GigabitEthernet0/0')`, "getLightStatus", []);
    console.log(`\nEstado final del LED Físico: ${led.result === 1 ? colors.green("🟢 VERDE (UP)") : colors.orange("🟠 NARANJA (STP)")}`);

  } catch (error: any) {
    console.error(colors.red(`\n💥 Error: ${error.message}`));
  } finally {
    await controller.stop();
  }
}

dhcpExperiment();
