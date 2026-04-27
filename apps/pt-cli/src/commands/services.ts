#!/usr/bin/env bun
/**
 * Comando services - DHCP, NTP, Syslog
 * Thin CLI wrapper que delega a pt-control/application/network-services
 */

import { Command } from "commander";

import type { CliResult } from "../contracts/cli-result.js";
import { createSuccessResult, createErrorResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";

import { runCommand } from "../application/run-command.js";
import { renderCliResult } from "../ux/renderers.js";
import { printExamples } from "../ux/examples.js";
import { buildFlags, parseGlobalOptions } from "../flags-utils.js";

import {
  executeDhcpService,
  executeNtpService,
  executeSyslogService,
  buildDhcpServiceCommands,
  buildNtpServiceCommands,
  buildSyslogServiceCommands,
  type DhcpServiceResult,
  type NtpServiceResult,
  type SyslogServiceResult,
} from "@cisco-auto/pt-control/application/network-services";

export {
  buildDhcpServiceCommands as buildDhcpCommands,
  buildNtpServiceCommands as buildNtpCommands,
  buildSyslogServiceCommands as buildSyslogCommands,
};

interface DhcpServiceResultCli {
  device: string;
  pool: string;
  network: string;
  commandsGenerated: number;
}

interface NtpServiceResultCli {
  device: string;
  server: string;
  commandsGenerated: number;
}

interface SyslogServiceResultCli {
  device: string;
  server: string;
  commandsGenerated: number;
}

const SERVICES_EXAMPLES = [
  {
    command: "pt services dhcp create --device R1 --pool MI_POOL --network 192.168.1.0/24",
    description: "Crear pool DHCP",
  },
  {
    command: "pt services ntp add-server --device R1 --server pool.ntp.org",
    description: "Configurar NTP",
  },
  {
    command: "pt services syslog add-server --device R1 --server 192.168.1.100",
    description: "Configurar Syslog",
  },
];

const SERVICES_META: CommandMeta = {
  id: "services",
  summary: "Configurar servicios de red (DHCP, NTP, Syslog)",
  longDescription:
    "Comandos para configurar servicios básicos en routers Cisco: DHCP, NTP y Syslog.",
  examples: SERVICES_EXAMPLES,
  related: ["config-ios", "routing", "show"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function createLabServicesCommand(): Command {
  const cmd = new Command("service")
    .alias("services")
    .description("Comandos para configurar servicios de red (DHCP/NTP/Syslog)")
    .option("--examples", "Mostrar ejemplos de uso", false)
    .option("--explain", "Explicar qué hace el comando", false)
    .option("--plan", "Mostrar plan de ejecución sin ejecutar", false);

  const dhcpCmd = new Command("dhcp")
    .alias("dhcp-server")
    .description("Operaciones sobre DHCP")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false);

  dhcpCmd
    .command("create")
    .description("Crear pool DHCP en un dispositivo")
    .requiredOption("--device <name>", "Nombre del dispositivo objetivo")
    .requiredOption("--pool <name>", "Nombre del pool DHCP")
    .requiredOption("--network <cidr>", "Red en formato CIDR")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(SERVICES_META)); return; }
      if (explain) { console.log(SERVICES_META.longDescription ?? SERVICES_META.summary); return; }
      if (plan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Crear pool DHCP: ${options.pool}`);
        console.log(`  2. Red: ${options.network}`);
        console.log(`  3. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags = buildFlags({ explain, plan });
      const result = await runCommand({
        action: "services.dhcp.create",
        meta: SERVICES_META,
        flags,
        payloadPreview: { device: options.device, pool: options.pool, network: options.network },
        execute: async (ctx): Promise<CliResult<DhcpServiceResultCli>> => {
          const execution = await executeDhcpService(ctx.controller, {
            deviceName: options.device,
            poolName: options.pool,
            network: options.network,
          });

          if (!execution.ok) {
            return createErrorResult("services.dhcp.create", execution.error) as CliResult<DhcpServiceResultCli>;
          }

          return createSuccessResult("services.dhcp.create", {
            device: execution.data.device,
            pool: execution.data.pool,
            network: execution.data.network,
            commandsGenerated: execution.data.commandsGenerated,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  cmd.addCommand(dhcpCmd);

  const ntpCmd = new Command("ntp").description("Operaciones sobre NTP");

  ntpCmd
    .command("add-server")
    .description("Añadir servidor NTP a un dispositivo")
    .requiredOption("--device <name>", "Nombre del dispositivo objetivo")
    .requiredOption("--server <ip>", "IP o hostname del servidor NTP")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(SERVICES_META)); return; }
      if (plan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Configurar servidor NTP: ${options.server}`);
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags = buildFlags({ explain, plan });
      const result = await runCommand({
        action: "services.ntp.add-server",
        meta: SERVICES_META,
        flags,
        payloadPreview: { device: options.device, server: options.server },
        execute: async (ctx): Promise<CliResult<NtpServiceResultCli>> => {
          const execution = await executeNtpService(ctx.controller, {
            deviceName: options.device,
            server: options.server,
          });

          if (!execution.ok) {
            return createErrorResult("services.ntp.add-server", execution.error) as CliResult<NtpServiceResultCli>;
          }

          return createSuccessResult("services.ntp.add-server", {
            device: execution.data.device,
            server: execution.data.server,
            commandsGenerated: execution.data.commandsGenerated,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  cmd.addCommand(ntpCmd);

  const syslogCmd = new Command("syslog").description("Operaciones sobre Syslog");

  syslogCmd
    .command("add-server")
    .description("Añadir servidor Syslog a un dispositivo")
    .requiredOption("--device <name>", "Nombre del dispositivo objetivo")
    .requiredOption("--server <ip>", "IP del servidor Syslog")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(SERVICES_META)); return; }
      if (explain) { console.log(SERVICES_META.longDescription ?? SERVICES_META.summary); return; }
      if (plan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Configurar servidor Syslog: ${options.server}`);
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags = buildFlags({ explain, plan });
      const result = await runCommand({
        action: "services.syslog.add-server",
        meta: SERVICES_META,
        flags,
        payloadPreview: { device: options.device, server: options.server },
        execute: async (ctx): Promise<CliResult<SyslogServiceResultCli>> => {
          const execution = await executeSyslogService(ctx.controller, {
            deviceName: options.device,
            server: options.server,
          });

          if (!execution.ok) {
            return createErrorResult("services.syslog.add-server", execution.error) as CliResult<SyslogServiceResultCli>;
          }

          return createSuccessResult("services.syslog.add-server", {
            device: execution.data.device,
            server: execution.data.server,
            commandsGenerated: execution.data.commandsGenerated,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  cmd.addCommand(syslogCmd);

  return cmd;
}
