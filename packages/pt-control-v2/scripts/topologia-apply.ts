#!/usr/bin/env bun
/**
 * PT Control V2 - Script de Aplicación Automática de Topología
 * 
 * Este script descubre dispositivos en Packet Tracer y aplica
 * configuración dinámicamente según argumentos CLI o archivo de config.
 * 
 * Usage:
 *   # Usar archivo de configuración
 *   bun run scripts/topologia-apply.ts --config topology-config.json
 * 
 *   # Configuración rápida con argumentos CLI
 *   bun run scripts/topologia-apply.ts --vlans 10,20,30 --ssh-domain cisco.local
 * 
 *   # Modo simulación
 *   bun run scripts/topologia-apply.ts --dry-run --verbose
 * 
 *   # Sin argumentos: aplica defaults inteligentes (sin VLANs/SSH por seguridad)
 *   bun run scripts/topologia-apply.ts
 */

import pc from "picocolors";
import { readFileSync, existsSync } from "fs";
import { createDefaultPTController } from "../src/controller/index.js";
import { buildVlanCommands, buildTrunkCommands, buildSshCommands } from "../src/utils/ios-commands.js";
import type { DeviceState } from "../src/types/index.js";

// ============================================================================
// Tipos de Configuración Dinámica
// ============================================================================

interface VlanConfig {
  id: number;
  name?: string;
}

interface HostIpConfig {
  ip: string;
  mask: string;
  gateway: string;
}

interface SshConfig {
  domain: string;
  username: string;
  password: string;
}

interface TopologyConfig {
  vlans?: VlanConfig[];
  trunkPorts?: Record<string, string[]>;
  sshConfig?: SshConfig;
  hostIpConfig?: Record<string, HostIpConfig>;
}

// ============================================================================
// Parser de Argumentos CLI
// ============================================================================

function parseArgs(): { config: TopologyConfig; dryRun: boolean; verbose: boolean } {
  const args = process.argv.slice(2);
  
  const dryRun = args.includes("--dry-run");
  const verbose = args.includes("--verbose");
  
  const configFileIndex = args.indexOf("--config");
  const configFile = configFileIndex >= 0 ? args[configFileIndex + 1] : null;
  
  if (configFile) {
    if (!existsSync(configFile)) {
      logError(`Archivo de configuración no encontrado: ${configFile}`);
      process.exit(1);
    }
    
    try {
      const fileContent = readFileSync(configFile, "utf-8");
      const config = JSON.parse(fileContent) as TopologyConfig;
      log(pc.cyan(`✓ Configuración cargada desde: ${configFile}`));
      return { config, dryRun, verbose };
    } catch (error) {
      logError(`Error leyendo archivo de configuración: ${error}`);
      process.exit(1);
    }
  }
  
  const config: TopologyConfig = {};
  
  const vlansIndex = args.indexOf("--vlans");
  if (vlansIndex >= 0) {
    const vlansArg = args[vlansIndex + 1];
    config.vlans = vlansArg.split(",").map(v => ({ id: parseInt(v.trim()) }));
  }
  
  const sshDomainIndex = args.indexOf("--ssh-domain");
  const sshUserIndex = args.indexOf("--ssh-user");
  const sshPassIndex = args.indexOf("--ssh-pass");
  
  if (sshDomainIndex >= 0) {
    config.sshConfig = {
      domain: args[sshDomainIndex + 1],
      username: sshUserIndex >= 0 ? args[sshUserIndex + 1] : "admin",
      password: sshPassIndex >= 0 ? args[sshPassIndex + 1] : "admin",
    };
  }
  
  return { config, dryRun, verbose };
}

const { config: CONFIG, dryRun: DRY_RUN, verbose: VERBOSE } = parseArgs();

// ============================================================================
// Utilidades de Logging
// ============================================================================

function log(msg: string): void {
  console.log(msg);
}

function logSuccess(msg: string): void {
  console.log(pc.green(`✓ ${msg}`));
}

function logError(msg: string): void {
  console.error(pc.red(`✗ ${msg}`));
}

function logWarning(msg: string): void {
  console.warn(pc.yellow(`⚠ ${msg}`));
}

function logDebug(msg: string): void {
  if (VERBOSE) {
    console.log(pc.gray(`  → ${msg}`));
  }
}

// ============================================================================
// Clasificación de Dispositivos
// ============================================================================

type DeviceCategory = "switch" | "router" | "pc" | "server" | "unknown";

function classifyDevice(device: DeviceState): DeviceCategory {
  const type = device.type || "";
  const model = (device.model || "").toLowerCase();
  const name = (device.name || "").toLowerCase();

  // Detectar switches
  if (
    type === "switch" ||
    type === "switch_layer3" ||
    type === "multilayer_device" ||
    model.includes("2960") ||
    model.includes("2950") ||
    model.includes("3750") ||
    model.includes("3650") ||
    model.includes("switch")
  ) {
    return "switch";
  }

  // Detectar routers
  if (
    type === "router" ||
    model.includes("2911") ||
    model.includes("2921") ||
    model.includes("1941") ||
    model.includes("2811") ||
    model.includes("router")
  ) {
    return "router";
  }

  // Detectar servidores
  if (
    type === "server" ||
    model.includes("server") ||
    name.includes("server")
  ) {
    return "server";
  }

  // Detectar PCs
  if (
    type === "pc" ||
    model.includes("pc") ||
    model.includes("laptop") ||
    model.includes("desktop") ||
    model.includes("wireless")
  ) {
    return "pc";
  }

  return "unknown";
}

// ============================================================================
// Aplicación de Configuración
// ============================================================================

async function applyVlanConfig(controller: ReturnType<typeof createDefaultPTController>, deviceName: string): Promise<void> {
  if (!CONFIG.vlans || CONFIG.vlans.length === 0) {
    logDebug(`Sin VLANs configuradas - skipping`);
    return;
  }

  log(`  ${pc.cyan("Aplicando VLANs...")}`);

  const vlanIds = CONFIG.vlans.map(v => v.id);
  const commands = buildVlanCommands(vlanIds);
  
  logDebug(`Generados ${commands.length} comandos IOS para VLANs`);

  if (DRY_RUN) {
    log(`    [DRY-RUN] VLANs: ${vlanIds.join(", ")}`);
    return;
  }

  await controller.configIos(deviceName, commands, { save: true });
  logSuccess(`VLANs aplicadas a ${deviceName}`);
}

async function applyTrunkConfig(controller: ReturnType<typeof createDefaultPTController>, deviceName: string): Promise<void> {
  const ports = CONFIG.trunkPorts?.[deviceName];
  
  if (!ports || ports.length === 0) {
    logDebug(`No hay puertos trunk configurados para ${deviceName}`);
    return;
  }

  if (!CONFIG.vlans || CONFIG.vlans.length === 0) {
    logWarning(`Puertos trunk definidos pero sin VLANs configuradas - skipping`);
    return;
  }

  log(`  ${pc.cyan("Configurando trunks...")}`);

  const commands = buildTrunkCommands(ports, CONFIG.vlans.map(v => v.id));
  
  logDebug(`Generados ${commands.length} comandos IOS para trunks`);

  if (DRY_RUN) {
    log(`    [DRY-RUN] Puertos trunk: ${ports.join(", ")}`);
    return;
  }

  await controller.configIos(deviceName, commands, { save: true });
  logSuccess(`Trunks configurados en ${deviceName}: ${ports.join(", ")}`);
}

async function applySshConfig(controller: ReturnType<typeof createDefaultPTController>, deviceName: string): Promise<void> {
  if (!CONFIG.sshConfig) {
    logDebug(`Sin configuración SSH - skipping`);
    return;
  }

  log(`  ${pc.cyan("Configurando SSH...")}`);

  const commands = buildSshCommands(
    CONFIG.sshConfig.domain,
    CONFIG.sshConfig.username,
    CONFIG.sshConfig.password
  );
  
  logDebug(`Generados ${commands.length} comandos IOS para SSH`);

  if (DRY_RUN) {
    log(`    [DRY-RUN] SSH: domain=${CONFIG.sshConfig.domain}, user=${CONFIG.sshConfig.username}`);
    return;
  }

  await controller.configIos(deviceName, commands, { save: true });
  logSuccess(`SSH configurado en ${deviceName}`);
}

async function applyHostConfig(controller: ReturnType<typeof createDefaultPTController>, deviceName: string): Promise<void> {
  const ipConfig = CONFIG.hostIpConfig?.[deviceName];

  if (!ipConfig) {
    logDebug(`No hay configuración IP para ${deviceName}`);
    return;
  }

  log(`  ${pc.cyan(`Configurando IP: ${ipConfig.ip}`)}`);

  if (DRY_RUN) {
    log(`    [DRY-RUN] IP: ${ipConfig.ip}/${ipConfig.mask}, Gateway: ${ipConfig.gateway}`);
    return;
  }

  await controller.configHost(deviceName, {
    ip: ipConfig.ip,
    mask: ipConfig.mask,
    gateway: ipConfig.gateway,
  });
  logSuccess(`IP configurada en ${deviceName}: ${ipConfig.ip}`);
}

// ============================================================================
// Pipeline Principal
// ============================================================================

async function main(): Promise<void> {
  log(pc.bold("\n═══════════════════════════════════════════"));
  log(pc.bold("  PT Control V2 - Aplicación de Topología"));
  log(pc.bold("═══════════════════════════════════════════\n"));

  if (DRY_RUN) {
    logWarning("Modo SIMULACIÓN (dry-run) - No se aplicará ninguna configuración\n");
  }

  if (!CONFIG.vlans && !CONFIG.sshConfig && !CONFIG.hostIpConfig) {
    logWarning("⚠️  Sin configuración detectada");
    log("\nOpciones:");
    log("  1. Usar archivo: --config topology-config.json");
    log("  2. Usar argumentos: --vlans 10,20,30 --ssh-domain cisco.local");
    log("  3. Sin configuración: solo listar dispositivos\n");
  }

  const controller = createDefaultPTController();

  try {
    log("Iniciando controlador de Packet Tracer...");
    await controller.start();
    logSuccess("Controlador iniciado\n");

    // Descubrir dispositivos
    log(pc.cyan("Descubriendo dispositivos..."));
    const devices = await controller.listDevices();
    
    if (devices.length === 0) {
      logError("No se encontraron dispositivos en Packet Tracer");
      log("Asegúrate de tener abiertos los dispositivos en Packet Tracer y que el script PT esté conectado.");
      process.exit(1);
    }

    logSuccess(`Encontrados ${devices.length} dispositivos:\n`);

    // Clasificar dispositivos
    const categorized: Record<DeviceCategory, DeviceState[]> = {
      switch: [],
      router: [],
      pc: [],
      server: [],
      unknown: [],
    };

    for (const device of devices) {
      const category = classifyDevice(device);
      categorized[category].push(device);
      log(`  ${pc.gray("•")} ${device.name} (${device.model || device.type}) -> ${pc.blue(category)}`);
    }

    console.log("");

    // Aplicar configuración: Switches
    if (categorized.switch.length > 0) {
      log(pc.bold("🔧 Configurando SWITCHES...\n"));

      for (const device of categorized.switch) {
        try {
          log(pc.bold(`  Switch: ${device.name}`));

          await applyVlanConfig(controller, device.name);
          await applyTrunkConfig(controller, device.name);

          console.log("");
        } catch (error) {
          logError(`Error configurando switch ${device.name}: ${error}`);
          if (!DRY_RUN) {
            log("\n⚠️ Error detectado - Deteniendo aplicación (fail-fast)");
            log("Para continuar en modo simulación, usa: --dry-run");
            process.exit(1);
          }
        }
      }
    }

    // Aplicar configuración: Routers
    if (categorized.router.length > 0) {
      log(pc.bold("🔧 Configurando ROUTERS...\n"));

      for (const device of categorized.router) {
        try {
          log(pc.bold(`  Router: ${device.name}`));
          
          // Aplicar SSH
          await applySshConfig(controller, device.name);
          
          console.log("");
        } catch (error) {
          logError(`Error configurando router ${device.name}: ${error}`);
          if (!DRY_RUN) {
            log("\n⚠️ Error detectado - Deteniendo aplicación (fail-fast)");
            process.exit(1);
          }
        }
      }
    }

    // Aplicar configuración: PCs
    if (categorized.pc.length > 0) {
      log(pc.bold("🔧 Configurando PCs...\n"));

      for (const device of categorized.pc) {
        try {
          log(pc.bold(`  PC: ${device.name}`));
          
          // Aplicar configuración de IP
          await applyHostConfig(controller, device.name);
          
          console.log("");
        } catch (error) {
          logError(`Error configurando PC ${device.name}: ${error}`);
          if (!DRY_RUN) {
            log("\n⚠️ Error detectado - Deteniendo aplicación (fail-fast)");
            process.exit(1);
          }
        }
      }
    }

    // Aplicar configuración: Servidores
    if (categorized.server.length > 0) {
      log(pc.bold("🔧 Configurando SERVIDORES...\n"));

      for (const device of categorized.server) {
        try {
          log(pc.bold(`  Servidor: ${device.name}`));
          
          // Aplicar configuración de IP
          await applyHostConfig(controller, device.name);
          
          console.log("");
        } catch (error) {
          logError(`Error configurando servidor ${device.name}: ${error}`);
          if (!DRY_RUN) {
            log("\n⚠️ Error detectado - Deteniendo aplicación (fail-fast)");
            process.exit(1);
          }
        }
      }
    }

    // Resumen final
    log(pc.bold("═══════════════════════════════════════════"));
    log(pc.bold("  ✓ Aplicación de topología COMPLETADA"));
    log(pc.bold("═══════════════════════════════════════════\n"));

    log("Resumen:");
    log(`  ${pc.blue("Switches")}: ${categorized.switch.length}`);
    log(`  ${pc.blue("Routers")}: ${categorized.router.length}`);
    log(`  ${pc.blue("PCs")}: ${categorized.pc.length}`);
    log(`  ${pc.blue("Servidores")}: ${categorized.server.length}`);
    
    if (categorized.unknown.length > 0) {
      logWarning(`  ${pc.yellow("Desconocidos")}: ${categorized.unknown.length}`);
    }

    console.log("");

  } catch (error) {
    logError(`Error general: ${error}`);
    process.exit(1);
  } finally {
    await controller.stop();
    log("Controlador detenido.\n");
  }
}

// Ejecutar
main().catch((error) => {
  console.error(pc.red("Error fatal:"), error);
  process.exit(1);
});
