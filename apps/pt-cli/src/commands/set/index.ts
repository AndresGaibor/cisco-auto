#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { Command } from "commander";
import chalk from "chalk";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import { runCommand } from "../../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../../contracts/cli-result.js";
import { getGlobalFlags } from "../../flags.js";
import { parseCidrOrIp } from "./ip-utils.js";

interface SetHostResult {
  device: string;
  mode: "static" | "dhcp";
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  nextSteps: string[];
}

function printSetResult(result: unknown, flags: { json: boolean; quiet: boolean }): void {
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (flags.quiet) return;

  process.stdout.write("\n✓ Configuración aplicada\n");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write("\n");
}

function createSetHostCommand(): Command {
  const host = new Command("host")
    .description("Configura propiedades de red de PC/Server-PT")
    .addHelpText(
      "after",
      `
Ejemplos:
  pt set host PC1 ip 192.168.10.10/24 --gateway 192.168.10.1
  pt set host PC1 ip 192.168.10.10 --mask 255.255.255.0 --gateway 192.168.10.1 --dns 8.8.8.8
  pt set host PC1 dhcp

Después de configurar:
  pt cmd PC1 "ipconfig"
  pt verify dhcp PC1
  pt verify ping PC1 192.168.10.1
`,
    );

  host
    .command("ip")
    .description("Configura IP estática en host")
    .argument("<device>", "PC o Server-PT")
    .argument("<ip-or-cidr>", "IP o CIDR. Ej: 192.168.10.10/24")
    .option("--mask <mask>", "Máscara si no usas CIDR")
    .option("--gateway <gateway>", "Gateway por defecto")
    .option("--dns <dns>", "DNS")
    .action(async (device: string, ipOrCidr: string, options, command) => {
      const flags = getGlobalFlags(command);
      const parsed = parseCidrOrIp(ipOrCidr, options.mask);

      const wrapped = await runCommand<SetHostResult>({
        action: "set.host.ip",
        meta: {
          id: "set.host.ip",
          summary: "Configura IP estática de host",
          examples: [],
          related: ["cmd", "verify"],
          tags: ["set", "host", "ip"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: true,
          supportsExplain: true,
        },
        flags: {
          json: flags.json,
          jq: null,
          output: "text",
          verbose: flags.verbose,
          quiet: flags.quiet,
          trace: flags.trace,
          tracePayload: false,
          traceResult: false,
          traceDir: null,
          traceBundle: false,
          traceBundlePath: null,
          sessionId: null,
          examples: false,
          schema: false,
          explain: false,
          plan: false,
          verify: true,
          timeout: flags.timeout ?? undefined,
          noTimeout: false,
          table: false,
          raw: false,
          yes: false,
          noInput: flags.noInput,
          noColor: false,
          lightweightContext: flags.lightweightContext,
        },
        payloadPreview: {
          device,
          ip: parsed.ip,
          mask: parsed.mask,
          gateway: options.gateway,
          dns: options.dns,
        },
        execute: async (ctx) => {
          try {
            await ctx.controller.configHost(device, {
              ip: parsed.ip,
              mask: parsed.mask,
              gateway: options.gateway,
              dns: options.dns,
              dhcp: false,
            });
          } catch (error) {
            return createErrorResult("set.host.ip", {
              code: "HOST_CONFIG_FAILED",
              message: error instanceof Error ? error.message : String(error),
            });
          }

          return createSuccessResult("set.host.ip", {
            device,
            mode: "static",
            ip: parsed.ip,
            mask: parsed.mask,
            gateway: options.gateway,
            dns: options.dns,
            nextSteps: [
              `pt cmd ${device} "ipconfig"`,
              options.gateway ? `pt verify ping ${device} ${options.gateway}` : `pt verify dhcp ${device}`,
            ],
          });
        },
      });

      printSetResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  host
    .command("dhcp")
    .description("Activa DHCP en host")
    .argument("<device>", "PC o Server-PT")
    .action(async (device: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<SetHostResult>({
        action: "set.host.dhcp",
        meta: {
          id: "set.host.dhcp",
          summary: "Activa DHCP en host",
          examples: [],
          related: ["cmd", "verify"],
          tags: ["set", "host", "dhcp"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: true,
          supportsExplain: true,
        },
        flags: {
          json: flags.json,
          jq: null,
          output: "text",
          verbose: flags.verbose,
          quiet: flags.quiet,
          trace: flags.trace,
          tracePayload: false,
          traceResult: false,
          traceDir: null,
          traceBundle: false,
          traceBundlePath: null,
          sessionId: null,
          examples: false,
          schema: false,
          explain: false,
          plan: false,
          verify: true,
          timeout: flags.timeout ?? undefined,
          noTimeout: false,
          table: false,
          raw: false,
          yes: false,
          noInput: flags.noInput,
          noColor: false,
          lightweightContext: flags.lightweightContext,
        },
        payloadPreview: { device, dhcp: true },
        execute: async (ctx) => {
          try {
            await ctx.controller.configHost(device, {
              dhcp: true,
            });
          } catch (error) {
            return createErrorResult("set.host.dhcp", {
              code: "HOST_CONFIG_FAILED",
              message: error instanceof Error ? error.message : String(error),
            });
          }

          return createSuccessResult("set.host.dhcp", {
            device,
            mode: "dhcp",
            nextSteps: [
              `pt cmd ${device} "ipconfig"`,
              `pt verify dhcp ${device}`,
            ],
          });
        },
      });

      printSetResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  return host;
}

interface SetInterfaceResult {
  device: string;
  interface: string;
  changes: string[];
  nextSteps: string[];
}

function createSetInterfaceCommand(): Command {
  return new Command("interface")
    .description("Configura propiedades comunes de interfaz (abstracto)")
    .argument("<device>", "Dispositivo")
    .argument("<interface>", "Interfaz (ej: g0/0)")
    .option("--desc <text>", "Descripción de la interfaz")
    .option("--vlan <id>", "VLAN de acceso (si es switch)")
    .option("--mode <access|trunk>", "Modo switchport")
    .option("--shutdown", "Apagar interfaz", false)
    .option("--no-shutdown", "Encender interfaz", false)
    .action(async (device: string, interfaceName: string, options, command) => {
      const flags = getGlobalFlags(command);
      const commands: string[] = [`interface ${interfaceName}`];
      const changes: string[] = [];

      if (options.desc) {
        commands.push(`description ${options.desc}`);
        changes.push(`description: ${options.desc}`);
      }
      if (options.mode) {
        commands.push(`switchport mode ${options.mode}`);
        changes.push(`mode: ${options.mode}`);
      }
      if (options.vlan) {
        commands.push(`switchport access vlan ${options.vlan}`);
        changes.push(`vlan: ${options.vlan}`);
      }
      if (options.shutdown) {
        commands.push("shutdown");
        changes.push("state: shutdown");
      }
      if (options.noShutdown) {
        commands.push("no shutdown");
        changes.push("state: up");
      }

      if (commands.length === 1) {
        console.log(chalk.yellow("No se especificaron cambios para la interfaz."));
        return;
      }

      const wrapped = await runCommand<SetInterfaceResult>({
        action: "set.interface",
        meta: {
          id: "set.interface",
          summary: "Configura interfaz",
          examples: [],
          related: ["cmd", "verify"],
          tags: ["set", "interface"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: true,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { device, interfaceName, changes },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `set-int-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(device, commands.join("\n"), {
            timeoutMs: flags.timeout ?? 30000,
            mode: "safe",
          });

          if (!result.ok) {
            return createErrorResult("set.interface", {
              code: "INTERFACE_CONFIG_FAILED",
              message: `Error configurando interfaz ${interfaceName} en ${device}`,
              details: { output: result.output }
            });
          }

          return createSuccessResult("set.interface", {
            device,
            interface: interfaceName,
            changes,
            nextSteps: [`pt cmd ${device} "show ip interface brief"`, `pt verify vlan ${device} ${options.vlan || ""}`]
          });
        }
      });

      printSetResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });
}

export function createSetCommand(): Command {
  const set = new Command("set")
    .description("Configura propiedades/API/GUI que no son terminal")
    .addHelpText(
      "after",
      `
Regla:
  - Si se puede escribir en consola: pt cmd
  - Si se configura por GUI/API: pt set
  - pt set interface es un helper experto para tareas comunes.

Ejemplos:
  pt set host PC1 ip 192.168.10.10/24 --gateway 192.168.10.1
  pt set host PC1 dhcp
  pt set interface SW1 f0/1 --vlan 10 --no-shutdown
`,
    );

  set.addCommand(createSetHostCommand());
  set.addCommand(createSetInterfaceCommand());

  return set;
}
