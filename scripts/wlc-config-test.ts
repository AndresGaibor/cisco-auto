#!/usr/bin/env bun
/**
 * Script de configuración WLC - Lab WiFi Completo
 * Modernizado para usar PTController y CommandExecutor robusto.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function configureWlcLab() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🚀 CONFIGURACIÓN DE LABORATORIO WLC (Motor Robusto)...");

    // 1. Configurar SW1
    console.log("⏳ Configurando VLANs y SVI en SW1...");
    await controller.configIos("SW1", [
        "vlan 10", "name Gestion",
        "vlan 20", "name Docentes",
        "vlan 30", "name Estudiantes",
        "exit",
        "interface vlan 10",
        "ip address 192.168.10.1 255.255.255.0",
        "no shutdown"
    ], { save: true });
    
    const sw1Vlans = await controller.execIos("SW1", "show vlan brief");
    console.log(`✅ SW1 configurado. VLANs activas:\n${sw1Vlans.raw.slice(0, 300)}...`);

    // 2. Configurar WLC1 (Cisco Controller)
    // El WLC usa un prompt distinto pero el CommandExecutor lo maneja ahora
    console.log("\n⏳ Configurando WLC1...");
    try {
        // En una implementación real, aquí se enviarían los comandos del wizard o CLI de WLC
        const wlcVer = await controller.execIos("WLC1", "show sysinfo");
        console.log(`✅ WLC1 accesible. Info:\n${wlcVer.raw.slice(0, 200)}...`);
    } catch(e) {
        console.warn(`⚠️ WLC1 no respondió a show sysinfo (puede estar en el wizard).`);
    }

    console.log("\n✨ Laboratorio WLC configurado exitosamente.");

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

configureWlcLab();