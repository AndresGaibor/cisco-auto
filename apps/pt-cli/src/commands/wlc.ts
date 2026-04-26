#!/usr/bin/env bun
/**
 * WLC Commands - Automatización de Wireless LAN Controller
 * Thin CLI que delega lógica a pt-control/application/wlc
 */

import { Command } from "commander";
import chalk from "chalk";

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';

import { runCommand } from '../application/run-command.js';
import { printExamples } from '../ux/examples.js';
import { buildFlags, parseGlobalOptions } from '../flags-utils.js';

import {
  setupWlcNetwork,
  getWlcNetworkStatus,
  configureWlcIp,
  configureWlcGateway,
  enablePoE,
  addApPowerAdapter,
  configureSwitchSvi,
  type WlcNetworkSetupResult,
  type WlcDeviceStatusResult,
} from '@cisco-auto/pt-control/application/wlc';

const WLC_META: CommandMeta = {
  id: 'wlc',
  summary: 'Comandos para Wireless LAN Controller y red asociada',
  longDescription: 'Setup automático de red WLC, estado de dispositivos, configuración de IPs, PoE y Access Points.',
  examples: [
    { command: 'pt wlc setup', description: 'Setup completo: power devices, PoE, IPs, gateway' },
    { command: 'pt wlc status', description: 'Ver estado de red (devices, ports, IPs)' },
    { command: 'pt wlc ip 192.168.10.2 255.255.255.0 192.168.10.1', description: 'Configurar IP management del WLC' },
    { command: 'pt wlc poe SW1 FastEthernet0/3', description: 'Habilitar PoE en puerto de switch' },
  ],
  related: ['config-ios', 'show'],
  supportsVerify: false,
  supportsJson: false,
  supportsPlan: false,
  supportsExplain: false,
  requiresPT: true,
};

function renderResult(result: CliResult, flags: { output: string; quiet: boolean }): void {
  const output = result.ok
    ? JSON.stringify(result.data, null, 2)
    : `Error: ${result.error?.message}`;
  if (!flags.quiet || !result.ok) console.log(output);
  if (!result.ok) process.exit(1);
}

export function createWlcCommand(): Command {
  const wlc = new Command("wlc")
    .description("Comandos para Wireless LAN Controller y red asociada");

  wlc
    .command("setup")
    .description("Setup completo: power devices, PoE, IPs, gateway")
    .action(async () => {
      const { examples } = parseGlobalOptions();
      if (examples) { console.log(printExamples(WLC_META)); return; }

      const flags = buildFlags({});
      const result = await runCommand({
        action: 'wlc.setup', meta: WLC_META, flags,
        payloadPreview: {},
        execute: async (ctx): Promise<CliResult<WlcNetworkSetupResult>> => {
          const wlcResult = await setupWlcNetwork({ omniscience: ctx.controller.omniscience });
          if (!wlcResult.ok) return createErrorResult('wlc.setup', { message: wlcResult.error!.message });

          const data = wlcResult.data!;
          console.log(chalk.blue("=== WLC Network Setup ===\n"));

          if (data.success) {
            console.log(chalk.green("\nConfiguración completada:"));
            data.configured.forEach((d: string) => console.log(`   - ${d}`));
          } else {
            console.log(chalk.red("\nErrores:"));
            data.errors.forEach((e: string) => console.log(`   - ${e}`));
          }

          const statusResult = await getWlcNetworkStatus({ omniscience: ctx.controller.omniscience });
          console.log(chalk.green("\n=== Estado Final ==="));
          if (statusResult.ok && statusResult.data) {
            console.log(`   Dispositivos: ${statusResult.data.devices.length}`);
            console.log(`   All Powered: ${statusResult.data.allPowered ? 'YES' : 'NO'}`);
            for (const dev of statusResult.data.devices) {
              const icon = dev.powered ? chalk.green("✓") : chalk.red("✗");
              console.log(`   ${icon} ${dev.name} (${dev.model}) - ${dev.ip || 'sin IP'}`);
            }
          }

          return createSuccessResult('wlc.setup', data, { advice: wlcResult.advice });
        },
      });
      renderResult(result, flags);
    });

  wlc
    .command("status")
    .description("Ver estado de red (devices, ports, IPs)")
    .action(async () => {
      const { examples } = parseGlobalOptions();
      if (examples) { console.log(printExamples(WLC_META)); return; }

      const flags = buildFlags({});
      const result = await runCommand({
        action: 'wlc.status', meta: WLC_META, flags,
        payloadPreview: {},
        execute: async (ctx): Promise<CliResult<WlcDeviceStatusResult>> => {
          const wlcResult = await getWlcNetworkStatus({ omniscience: ctx.controller.omniscience });
          if (!wlcResult.ok) return createErrorResult('wlc.status', { message: wlcResult.error!.message });

          const data = wlcResult.data!;
          console.log(chalk.blue("\n=== Estado de Red WLC ===\n"));
          console.log(`Dispositivos: ${data.devices.length}`);
          console.log(`Todos encendidos: ${data.allPowered ? 'SI' : 'NO'}`);
          console.log(`Todos conectados: ${data.allConnected ? 'SI' : 'NO'}`);

          console.log(chalk.yellow("\n--- Detalle por Dispositivo ---\n"));
          for (const dev of data.devices) {
            const powerIcon = dev.powered ? chalk.green("●") : chalk.red("○");
            const linkIcon = dev.portsUp.length > 0 ? chalk.green("✓") : chalk.red("✗");
            console.log(`${powerIcon} ${chalk.cyan(dev.name)} (${dev.model})`);
            console.log(`   IP: ${dev.ip || chalk.gray('N/A')}`);
            console.log(`   Ports UP: ${dev.portsUp.join(', ') || chalk.gray('ninguno')}`);
            if (dev.portsDown.length > 0) {
              console.log(`   Ports DOWN: ${dev.portsDown.join(', ')}`);
            }
            console.log(`   Link Status: ${linkIcon}`);
            console.log();
          }

          return createSuccessResult('wlc.status', data);
        },
      });
      renderResult(result, flags);
    });

  wlc
    .command("ip")
    .description("Configurar IP management del WLC")
    .argument("<ip>", "Dirección IP")
    .argument("<mask>", "Máscara de subred")
    .argument("<gateway>", "Default gateway")
    .action(async (ip: string, mask: string, gateway: string) => {
      const { examples } = parseGlobalOptions();
      if (examples) { console.log(printExamples(WLC_META)); return; }

      const flags = buildFlags({});
      const result = await runCommand({
        action: 'wlc.ip', meta: WLC_META, flags,
        payloadPreview: { ip, mask, gateway },
        execute: async (ctx): Promise<CliResult<{ ip: string; mask: string; gateway: string }>> => {
          const wlcResult = await configureWlcIp({ omniscience: ctx.controller.omniscience }, ip, mask, gateway);
          if (!wlcResult.ok) return createErrorResult('wlc.ip', { message: wlcResult.error!.message });

          const data = wlcResult.data!;
          console.log(chalk.green(`\nWLC1 Management IP: ${data.ip}/${data.mask}`));
          console.log(chalk.green(`  Gateway: ${data.gateway}`));

          return createSuccessResult('wlc.ip', data, { advice: wlcResult.advice });
        },
      });
      renderResult(result, flags);
    });

  wlc
    .command("gateway")
    .description("Configurar default gateway del WLC")
    .argument("<ip>", "Dirección IP del gateway")
    .action(async (ip: string) => {
      const { examples } = parseGlobalOptions();
      if (examples) { console.log(printExamples(WLC_META)); return; }

      const flags = buildFlags({});
      const result = await runCommand({
        action: 'wlc.gateway', meta: WLC_META, flags,
        payloadPreview: { ip },
        execute: async (ctx): Promise<CliResult<{ ip: string }>> => {
          const wlcResult = await configureWlcGateway({ omniscience: ctx.controller.omniscience }, ip);
          if (!wlcResult.ok) return createErrorResult('wlc.gateway', { message: wlcResult.error!.message });

          console.log(chalk.green(`\nWLC1 Gateway: ${ip}`));
          return createSuccessResult('wlc.gateway', wlcResult.data);
        },
      });
      renderResult(result, flags);
    });

  wlc
    .command("poe")
    .description("Habilitar PoE en puerto de switch")
    .argument("<switch>", "Nombre del switch")
    .argument("<port>", "Nombre del puerto")
    .action(async (switchName: string, portName: string) => {
      const { examples } = parseGlobalOptions();
      if (examples) { console.log(printExamples(WLC_META)); return; }

      const flags = buildFlags({});
      const result = await runCommand({
        action: 'wlc.poe', meta: WLC_META, flags,
        payloadPreview: { switch: switchName, port: portName },
        execute: async (ctx): Promise<CliResult<{ switch: string; port: string }>> => {
          const wlcResult = await enablePoE({ omniscience: ctx.controller.omniscience }, switchName, portName);
          if (!wlcResult.ok) return createErrorResult('wlc.poe', { message: wlcResult.error!.message });

          console.log(chalk.green(`\nPoE habilitado: ${switchName}:${portName}`));
          return createSuccessResult('wlc.poe', wlcResult.data);
        },
      });
      renderResult(result, flags);
    });

  const apCmd = new Command("ap")
    .description("Comandos para Access Points");

  apCmd
    .command("power-add")
    .description("Agregar power adapter a un AP")
    .argument("<ap-name>", "Nombre del AP (AP1, AP2, AP3)")
    .action(async (apName: string) => {
      const { examples } = parseGlobalOptions();
      if (examples) { console.log(printExamples(WLC_META)); return; }

      const flags = buildFlags({});
      const result = await runCommand({
        action: 'wlc.ap.power-add', meta: WLC_META, flags,
        payloadPreview: { ap: apName },
        execute: async (ctx): Promise<CliResult<{ ap: string }>> => {
          const wlcResult = await addApPowerAdapter({ omniscience: ctx.controller.omniscience }, apName);
          if (!wlcResult.ok) {
            console.log(chalk.red(`\nFallo al agregar power adapter a ${apName}`));
            return createErrorResult('wlc.ap.power-add', { message: wlcResult.error!.message });
          }

          console.log(chalk.green(`\nPower adapter agregado a ${apName}`));
          return createSuccessResult('wlc.ap.power-add', wlcResult.data, { advice: wlcResult.advice });
        },
      });
      renderResult(result, flags);
    });

  wlc.addCommand(apCmd);

  const swCmd = new Command("sw")
    .description("Comandos para switches");

  swCmd
    .command("svi")
    .description("Configurar SVI en switch")
    .argument("<switch>", "Nombre del switch")
    .argument("<vlan>", "ID de VLAN")
    .argument("<ip>", "Dirección IP")
    .argument("<mask>", "Máscara de subred")
    .action(async (switchName: string, vlanId: string, ip: string, mask: string) => {
      const { examples } = parseGlobalOptions();
      if (examples) { console.log(printExamples(WLC_META)); return; }

      const flags = buildFlags({});
      const result = await runCommand({
        action: 'wlc.sw.svi', meta: WLC_META, flags,
        payloadPreview: { switch: switchName, vlan: vlanId, ip, mask },
        execute: async (ctx): Promise<CliResult<{ switch: string; vlan: string; ip: string }>> => {
          const wlcResult = await configureSwitchSvi({ omniscience: ctx.controller.omniscience }, switchName, vlanId, ip, mask);
          if (!wlcResult.ok) return createErrorResult('wlc.sw.svi', { message: wlcResult.error!.message });

          const data = wlcResult.data!;
          console.log(chalk.green(`\n${switchName} Vlan${vlanId}: ${ip}/${mask}`));
          return createSuccessResult('wlc.sw.svi', data, { advice: wlcResult.advice });
        },
      });
      renderResult(result, flags);
    });

  wlc.addCommand(swCmd);

  return wlc;
}