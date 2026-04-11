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

import * as pc from "picocolors";
import { readFileSync, existsSync } from "fs";
import { readdir, unlink } from "node:fs/promises";
import { createDefaultPTController } from "../src/controller/index.js";
import { VlanGenerator, buildTrunkCommands, buildSshCommands } from '@cisco-auto/core';
import type { DeviceState } from "../src/types/index.js";

// ============================================================================
// Tipos de Configuración Dinámica
// ============================================================================

interface VlanConfig {
  id: number;
  name?: string;
}

interface DeviceConfig {
  name: string;
  model: string;
  x: number;
  y: number;
}

interface LinkConfig {
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
  cableType?: 'auto' | 'straight' | 'crossover' | 'serial' | 'fiber';
}

interface AccessPortConfig {
  device: string;
  port: string;
  vlan: number;
  portfast?: boolean;
}

interface SviConfig {
  device: string;
  vlan: number;
  ip: string;
  mask: string;
  helperAddress?: string;
}

interface DhcpPoolConfig {
  device: string;
  poolName: string;
  network: string;
  subnetMask: string;
  defaultRouter: string;
  dnsServers?: string[];
  excludedAddresses?: string[];
  leaseTime?: number;
  domainName?: string;
}

interface HostIpConfig {
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

interface SshConfig {
  domain: string;
  username: string;
  password: string;
}

interface TopologyConfig {
  rebuildTopology?: boolean;
  devices?: DeviceConfig[];
  links?: LinkConfig[];
  vlans?: VlanConfig[];
  trunkPorts?: Record<string, string[]>;
  accessPorts?: AccessPortConfig[];
  svis?: SviConfig[];
  dhcpPools?: DhcpPoolConfig[];
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
    if (vlansArg) {
      config.vlans = vlansArg.split(",").map(v => ({ id: parseInt(v.trim()) }));
    }
  }
  
  const sshDomainIndex = args.indexOf("--ssh-domain");
  const sshUserIndex = args.indexOf("--ssh-user");
  const sshPassIndex = args.indexOf("--ssh-pass");
  
  if (sshDomainIndex >= 0) {
    config.sshConfig = {
      domain: args[sshDomainIndex + 1] ?? "cisco.local",
      username: (sshUserIndex >= 0 ? args[sshUserIndex + 1] : undefined) ?? "admin",
      password: (sshPassIndex >= 0 ? args[sshPassIndex + 1] : undefined) ?? "admin",
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapCableTypeToLinkType(cableType?: LinkConfig['cableType']): 'auto' | 'straight' | 'cross' | 'serial' | 'fiber' {
  switch (cableType) {
    case 'crossover':
      return 'cross';
    case 'straight':
    case 'auto':
    case 'serial':
    case 'fiber':
      return cableType;
    default:
      return 'auto';
  }
}

async function waitForDeviceNames(controller: ReturnType<typeof createDefaultPTController>, expectedNames: string[], timeoutMs = 30000): Promise<boolean> {
  const started = Date.now();
  const target = new Set(expectedNames);
  while (Date.now() - started < timeoutMs) {
    const devices = await controller.listDevices();
    const names = new Set(devices.map((device) => device.name));
    if ([...target].every((name) => names.has(name))) {
      return true;
    }
    await sleep(500);
  }
  return false;
}

async function clearBridgeQueue(): Promise<void> {
  const ptDevDir = process.env.PT_DEV_DIR ?? `${process.env.HOME ?? ""}/pt-dev`;
  const dirs = [
    `${ptDevDir}/commands`,
    `${ptDevDir}/in-flight`,
    `${ptDevDir}/results`,
  ];

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir);
      await Promise.all(entries.filter((entry) => entry.endsWith('.json')).map((entry) => unlink(`${dir}/${entry}`)));
    } catch {
      // Ignore missing directories or cleanup errors; we only want a best-effort reset.
    }
  }
}

async function dismissInitialDialog(controller: ReturnType<typeof createDefaultPTController>, device: string): Promise<void> {
  try {
    await controller.execInteractive(device, 'no', {
      timeout: 5000,
      parse: false,
      ensurePrivileged: false,
    });
  } catch {
    // If the device is not showing the setup dialog, continue silently.
  }
}

async function enablePrivilegedMode(controller: ReturnType<typeof createDefaultPTController>, device: string): Promise<void> {
  try {
    await controller.execInteractive(device, 'enable', {
      timeout: 5000,
      parse: false,
      ensurePrivileged: true,
    });
  } catch {
    // If the device is already privileged or still booting, continue silently.
  }
}

async function waitForTopologyMaterialization(
  controller: ReturnType<typeof createDefaultPTController>,
  expectedNames: string[],
  expectedLinkCount: number,
  maxAttempts = 120,
  delayMs = 1000,
): Promise<{ devices: Array<{ name: string }>; snapshot: { devices: Record<string, unknown>; links: Record<string, unknown> } | null }> {
  let latestSnapshot: { devices: Record<string, unknown>; links: Record<string, unknown> } | null = null;
  let latestDevices: Array<{ name: string }> = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    latestDevices = await controller.listDevices();
    latestSnapshot = await controller.snapshot();

    const names = new Set(latestDevices.map((device) => device.name));
    const linkCount = Object.keys(latestSnapshot?.links ?? {}).length;

    if (expectedNames.every((name) => names.has(name)) && linkCount >= expectedLinkCount) {
      return { devices: latestDevices, snapshot: latestSnapshot };
    }

    await sleep(delayMs);
  }

  throw new Error(`La topología no materializó completamente a tiempo (devices=${latestDevices.length}, links=${Object.keys(latestSnapshot?.links ?? {}).length}, esperados=${expectedNames.length}/${expectedLinkCount})`);
}

async function applyTopologyDefinition(controller: ReturnType<typeof createDefaultPTController>): Promise<void> {
  if (!CONFIG.devices?.length && !CONFIG.links?.length) {
    return;
  }

  if (DRY_RUN) {
    log(pc.bold("🧩 [DRY-RUN] Topología declarativa detectada"));
    if (CONFIG.devices?.length) {
      log(`  Dispositivos: ${CONFIG.devices.map((device) => device.name).join(', ')}`);
    }
    if (CONFIG.links?.length) {
      log(`  Enlaces: ${CONFIG.links.length}`);
    }
    return;
  }

  await clearBridgeQueue();
  log(pc.bold("🧩 Construyendo topología desde config..."));
  if (CONFIG.rebuildTopology !== false) {
    try {
      const cleared = await controller.clearTopology();
      logDebug(`Topología limpiada: ${cleared.removedDevices} dispositivos / ${cleared.removedLinks} enlaces`);
    } catch (error) {
      logWarning(`No se pudo limpiar la topología previa: ${error}`);
    }
  }

  if (CONFIG.devices?.length) {
    log(pc.cyan("Creando dispositivos..."));
    for (const device of CONFIG.devices) {
      log(`  ${pc.gray("•")} ${device.name} (${device.model}) @ ${device.x},${device.y}`);
      await controller.addDevice(device.name, device.model, { x: device.x, y: device.y });
    }

    const created = await waitForDeviceNames(controller, CONFIG.devices.map((device) => device.name));
    if (!created) {
      throw new Error('Los dispositivos no materializaron a tiempo en Packet Tracer');
    }
  }

  const initialDialogDevices = (CONFIG.devices ?? [])
    .filter((device) => /2960|3560|3750|3650|switch/i.test(device.model) || /switch|core/i.test(device.name))
    .map((device) => device.name);

  if (initialDialogDevices.length > 0) {
    log(pc.cyan("Desactivando diálogos iniciales en dispositivos de red..."));
    for (const deviceName of initialDialogDevices) {
      await dismissInitialDialog(controller, deviceName);
      await enablePrivilegedMode(controller, deviceName);
    }
    await sleep(1000);
  }

  if (CONFIG.links?.length) {
    log(pc.cyan("Creando enlaces..."));
    for (const link of CONFIG.links) {
      const linkType = mapCableTypeToLinkType(link.cableType);
      log(`  ${pc.gray("•")} ${link.fromDevice}:${link.fromPort} -> ${link.toDevice}:${link.toPort} (${linkType})`);
      await controller.addLink(link.fromDevice, link.fromPort, link.toDevice, link.toPort, linkType);
      await sleep(1000);
    }
  }

  await waitForTopologyMaterialization(
    controller,
    CONFIG.devices?.map((device) => device.name) ?? [],
    CONFIG.links?.length ?? 0,
  );

  await sleep(1000);
}

// ============================================================================
// Clasificación de Dispositivos
// ============================================================================

type DeviceCategory = "switch" | "router" | "pc" | "server" | "unknown";

function classifyDevice(device: DeviceState): DeviceCategory {
  const type = device.type || "";
  const model = (device.model || "").toLowerCase();
  const name = (device.name || "").toLowerCase();

  if (
    type === "switch" ||
    type === "switch_layer3" ||
    type === "multilayer_device" ||
    type === "multilayer-switch" ||
    model.includes("2960") ||
    model.includes("2950") ||
    model.includes("3560") ||
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

  const commands = ['! Configuración de VLANs'];
  for (const vlan of CONFIG.vlans) {
    commands.push(`vlan ${vlan.id}`);
    commands.push(` name ${vlan.name ?? `VLAN${vlan.id}`}`);
    commands.push(' exit');
  }

  logDebug(`Generados ${commands.length} comandos IOS para VLANs`);

  if (DRY_RUN) {
    log(`    [DRY-RUN] VLANs: ${CONFIG.vlans.map((v) => `${v.id}${v.name ? `:${v.name}` : ''}`).join(', ')}`);
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

  const commands = buildTrunkCommands(ports, CONFIG.vlans.map((v) => v.id));

  logDebug(`Generados ${commands.length} comandos IOS para trunks`);

  if (DRY_RUN) {
    log(`    [DRY-RUN] Puertos trunk: ${ports.join(', ')}`);
    return;
  }

  await controller.configIos(deviceName, commands, { save: true });
  logSuccess(`Trunks configurados en ${deviceName}: ${ports.join(', ')}`);
}

async function applyAccessPortsConfig(controller: ReturnType<typeof createDefaultPTController>, deviceName: string): Promise<void> {
  const ports = CONFIG.accessPorts?.filter((entry) => entry.device === deviceName);
  if (!ports || ports.length === 0) {
    return;
  }

  log(`  ${pc.cyan("Configurando puertos access...")}`);
  const commands: string[] = [];
  for (const port of ports) {
    commands.push(`interface ${port.port}`);
    commands.push(' switchport mode access');
    commands.push(` switchport access vlan ${port.vlan}`);
    if (port.portfast !== false) {
      commands.push(' spanning-tree portfast');
    }
    commands.push(' no shutdown');
    commands.push(' exit');
  }

  if (DRY_RUN) {
    log(`    [DRY-RUN] Access ports: ${ports.map((port) => `${port.port}:${port.vlan}`).join(', ')}`);
    return;
  }

  await controller.configIos(deviceName, commands, { save: true });
  logSuccess(`Puertos access configurados en ${deviceName}`);
}

async function applySviConfig(controller: ReturnType<typeof createDefaultPTController>, deviceName: string): Promise<void> {
  const svis = CONFIG.svis?.filter((entry) => entry.device === deviceName);
  if (!svis || svis.length === 0) {
    return;
  }

  log(`  ${pc.cyan("Configurando SVIs...")}`);
  const commands: string[] = ['configure terminal', 'ip routing'];
  for (const svi of svis) {
    commands.push(`interface vlan ${svi.vlan}`);
    commands.push(` ip address ${svi.ip} ${svi.mask}`);
    if (svi.helperAddress) {
      commands.push(` ip helper-address ${svi.helperAddress}`);
    }
    commands.push(' no shutdown');
    commands.push(' exit');
  }
  commands.push('end');

  if (DRY_RUN) {
    log(`    [DRY-RUN] SVIs: ${svis.map((svi) => `VLAN${svi.vlan}@${svi.ip}`).join(', ')}`);
    return;
  }

  await controller.configIos(deviceName, commands, { save: true });
  logSuccess(`SVIs configuradas en ${deviceName}`);
}

async function applyDhcpPoolsConfig(controller: ReturnType<typeof createDefaultPTController>): Promise<void> {
  if (!CONFIG.dhcpPools || CONFIG.dhcpPools.length === 0) {
    return;
  }

  log(pc.cyan('Configurando pools DHCP...'));
  for (const pool of CONFIG.dhcpPools) {
    if (DRY_RUN) {
      log(`    [DRY-RUN] ${pool.device}: ${pool.poolName} -> ${pool.network}/${pool.subnetMask}`);
      continue;
    }

    await controller.configureDhcpServer(pool.device, {
      poolName: pool.poolName,
      network: pool.network,
      subnetMask: pool.subnetMask,
      defaultRouter: pool.defaultRouter,
      dnsServers: pool.dnsServers,
      excludedAddresses: pool.excludedAddresses,
      leaseTime: pool.leaseTime,
      domainName: pool.domainName,
    });
    logSuccess(`DHCP pool ${pool.poolName} configurado en ${pool.device}`);
  }
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
    return;
  }

  if (ipConfig.dhcp) {
    log(`  ${pc.cyan(`Configurando DHCP en ${deviceName}`)}`);
    if (DRY_RUN) {
      log(`    [DRY-RUN] DHCP: ${deviceName}`);
      return;
    }
    await controller.configHost(deviceName, { dhcp: true });
    logSuccess(`DHCP habilitado en ${deviceName}`);
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
    dns: ipConfig.dns,
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

  if (!CONFIG.vlans && !CONFIG.sshConfig && !CONFIG.hostIpConfig && !CONFIG.accessPorts && !CONFIG.svis && !CONFIG.dhcpPools && !CONFIG.devices && !CONFIG.links) {
    logWarning("⚠️  Sin configuración detectada");
    log("\nOpciones:");
    log("  1. Usar archivo: --config topology-config.json");
    log("  2. Usar argumentos: --vlans 10,20,30 --ssh-domain cisco.local");
    log("  3. Sin configuración: solo listar dispositivos\n");
  }

  const controller = createDefaultPTController();

  try {
    await clearBridgeQueue();
    log("Iniciando controlador de Packet Tracer...");
    await controller.start();
    logSuccess("Controlador iniciado\n");

    await applyTopologyDefinition(controller);

    if (DRY_RUN && (CONFIG.devices?.length || CONFIG.links?.length)) {
      return;
    }

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

    if (categorized.switch.length > 0) {
      log(pc.cyan("Desactivando diálogos iniciales en switches..."));
      for (const device of categorized.switch) {
        await dismissInitialDialog(controller, device.name);
        await enablePrivilegedMode(controller, device.name);
      }
      await sleep(1000);
    }

    // Aplicar configuración: Switches
    if (categorized.switch.length > 0) {
      log(pc.bold("🔧 Configurando SWITCHES...\n"));

      for (const device of categorized.switch) {
        try {
          await applyVlanConfig(controller, device.name);
          await applyTrunkConfig(controller, device.name);
          await applyAccessPortsConfig(controller, device.name);
          await applySviConfig(controller, device.name);
          await sleep(1500);

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
          await sleep(1500);
          
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
          await sleep(1500);

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

    // Aplicar pools DHCP declarativos
    await applyDhcpPoolsConfig(controller);

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
