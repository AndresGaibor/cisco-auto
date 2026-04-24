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

  try {
    await controller.start();
    console.log(colors.bold("\n🧪 EXPERIMENTO: SINCRONIZACIÓN CLI -> IPC (DHCP)"));

    // 1. CONFIGURAR POR CLI USANDO MOTOR ROBUSTO
    console.log(colors.yellow(`\n⚙️ Configurando Pool DHCP en ${routerName}...`));
    await controller.configIos(routerName, [
        "ip dhcp pool LAN-POOL",
        "network 192.168.1.0 255.255.255.0",
        "default-router 192.168.1.1",
        "dns-server 8.8.8.8",
        "exit"
    ], { save: true });
    
    console.log(colors.green("   ✅ Comandos enviados y confirmados."));

    // 2. VALIDAR POR IPC (OMNISCIENCIA)
    console.log(colors.cyan("\n🔍 Interrogando al motor de omnisciencia..."));
    // Damos un tiempo mínimo para que el motor C++ actualice sus objetos internos
    await new Promise(r => setTimeout(r, 2000)); 

    const dhcpPath = `network().getDevice('${routerName}').getProcess('DhcpServerMainProcess')`;
    const poolCount = await controller.deepInspect(dhcpPath, "getPoolCount", []);
    
    if (poolCount.ok && poolCount.result > 0) {
        console.log(colors.bold.green(`\n✅ CONTEO DE POOLS DETECTADO POR IPC: ${poolCount.result}`));
        const poolInfo = await controller.deepInspect(dhcpPath, "getPoolAt", [0]);
        console.log(`   Datos del Pool [0]: ${JSON.stringify(poolInfo.result)}`);
    } else {
        console.log(colors.red(`\n❌ No se detectaron pools por IPC.`));
        console.log(colors.gray("   Nota: Es común que PT no sincronice instantáneamente la CLI con el modelo de objetos C++."));
    }

    // 3. VERIFICACIÓN DE LED
    const portPath = `network().getDevice('${routerName}').getPortAt(0)`;
    const led = await controller.deepInspect(portPath, "getLightStatus", []);
    console.log(`\nEstado final del LED Físico: ${led.result === 1 ? colors.green("🟢 VERDE (UP)") : colors.yellow("🟠 NARANJA/ROJO")}`);

  } catch (error: any) {
    console.error(colors.red(`\n💥 Error: ${error.message}`));
  } finally {
    await controller.stop();
  }
}

dhcpExperiment();
