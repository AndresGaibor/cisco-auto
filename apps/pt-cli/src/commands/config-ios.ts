#!/usr/bin/env bun
/**
 * Comando config-ios - Ejecutar comandos IOS en dispositivos Cisco
 * Thin CLI wrapper que delega a pt-control/application/config-ios
 */

import { Command } from "commander";
import chalk from "chalk";

import type { CliResult } from "../contracts/cli-result.js";
import { createSuccessResult, createErrorResult, createVerifiedResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";
import type { GlobalFlags } from "../flags.js";

import { runCommand } from "../application/run-command.js";
import { renderCliResult } from "../ux/renderers.ts";
import { fetchDeviceList, getIOSCapableDevices } from "../utils/device-utils.js";
import { buildFlags } from "../flags-utils.js";

import {
  buildVerificationPlan,
  detectCommandType,
  applyConfigIOS,
  type ConfigIOSControllerPort as PtControlConfigIOSControllerPort,
  type ConfigIOSPayload as PtControlConfigIOSPayload,
  type ConfigIOSResult as PtControlConfigIOSResult,
  type ConfigIOSVerification,
} from "@cisco-auto/pt-control/application/config-ios";

export { buildVerificationPlan };

export const CONFIG_IOS_META: CommandMeta = {
  id: "config-ios",
  summary: "Ejecutar comandos IOS en un dispositivo de red Cisco",
  longDescription:
    "Permite ejecutar comandos IOS directamente en routers y switches de Cisco Packet Tracer. Soporta multiples comandos, modo interactivo y verificacion automatica.",
  examples: [
    {
      command: "pt config-ios R1 \"show version\"",
      description: "Ejecutar comando show en el dispositivo",
    },
    {
      command: 'pt config-ios R1 "interface GigabitEthernet0/0"',
      description: "Entrar en modo de configuracion de interfaz",
    },
    {
      command: 'pt config-ios R1 "interface GigabitEthernet0/0" "ip address 192.168.1.1 255.255.255.0"',
      description: "Configurar IP en interfaz",
    },
    {
      command: 'pt config-ios R1 "vlan 10" "name ADMIN"',
      description: "Crear VLAN en switch",
    },
    {
      command: 'pt config-ios R1 "router ospf 1" "network 192.168.1.0 0.0.0.255 area 0"',
      description: "Configurar OSPF",
    },
    {
      command: 'pt config-ios R1 "ip route 0.0.0.0 0.0.0.0 192.168.1.254"',
      description: "Configurar ruta estatica",
    },
    {
      command: 'pt config-ios R1 "enable secret cisco"',
      description: "Configurar contrasena enable",
    },
    {
      command: 'pt config-ios R1 "line vty 0 4" "login local"',
      description: "Configurar acceso VTY",
    },
    {
      command: "pt config-ios --examples",
      description: "Mostrar ejemplos de comandos IOS",
    },
    {
      command: 'pt config-ios R1 --verify "interface Gi0/0"',
      description: "Ejecutar con verificacion automatica",
    },
  ],
  related: [
    "show ip interface brief",
    "show vlan brief",
    "show ip route",
    "show running-config",
    "show version",
  ],
  tags: ["ios", "config", "cisco", "network"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true,
};

interface ConfigIOSPayload {
  device: string;
  commands: string[];
  interactive?: boolean;
}

interface ConfigIOSResult {
  device: string;
  commands: string[];
  executed: number;
  errors: string[];
  commandOutputs?: Array<{
    index: number;
    command: string;
    ok: boolean;
    output: string;
  }>;
}

export function createConfigIOSCommand(): Command {
  const cmd = new Command("config-ios")
    .description("Ejecutar comandos IOS en un dispositivo de red Cisco")
    .argument("[device]", "Nombre del dispositivo")
    .argument("[command...]", "Comando(s) IOS a ejecutar")
    .option("-i, --interactive", "Modo interactivo (ejecutar comandos uno por uno)")
    .option("--verify", "Ejecutar verificacion automatica despues del comando", true)
    .option("--no-verify", "Deshabilitar verificacion automatica")
    .option("--show-output", "Mostrar output raw de los comandos IOS ejecutados")
    .action(async (device, commands, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalSchema = process.argv.includes("--schema");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        console.log("\n=== Ejemplos de comandos IOS ===\n");
        CONFIG_IOS_META.examples.forEach((ex, i) => {
          console.log("  " + (i + 1) + ". " + ex.command);
          console.log("     " + ex.description + "\n");
        });
        return;
      }

      if (globalSchema) {
        console.log(
          JSON.stringify(
            {
              type: "object",
              properties: {
                device: { type: "string" },
                commands: { type: "array", items: { type: "string" } },
                executed: { type: "number" },
                errors: { type: "array", items: { type: "string" } },
              },
            },
            null,
            2,
          ),
        );
        return;
      }

      if (globalExplain) {
        const cmdTypes = detectCommandType(commands);
        console.log("\n=== Analisis del comando ===\n");
        console.log("  Comandos a ejecutar: " + commands.length);
        console.log(
          "  Tipos detectados: " +
            (cmdTypes.length > 0 ? cmdTypes.join(", ") : "general"),
        );
        console.log(
          "  Verificacion: " +
            (options.verify ? "habilitada" : "deshabilitada") +
            "\n",
        );
        console.log("  Comandos IOS modifican la configuracion del dispositivo.");
        console.log("  Use --plan para ver que se ejecutaria sin aplicar cambios.\n");
        return;
      }

      if (globalPlan) {
        console.log("\n=== Plan de ejecucion ===\n");
        console.log("  Dispositivo: " + (device || "no seleccionado"));
        console.log("  Comandos: " + commands.length + "\n");
        commands.forEach((c: string, i: number) => {
          console.log("  " + (i + 1) + ". " + c);
        });
        console.log("\n  Verificacion: " + (options.verify ? "si" : "no") + "\n");
        return;
      }

      // Mostrar schema no requiere dispositivo
      if (options.schema) {
        console.log(
          JSON.stringify(
            {
              type: "object",
              properties: {
                device: { type: "string" },
                commands: { type: "array", items: { type: "string" } },
                executed: { type: "number" },
                errors: { type: "array", items: { type: "string" } },
              },
            },
            null,
            2,
          ),
        );
        return;
      }

      if (options.explain || globalExplain) {
        const cmdTypes = detectCommandType(commands);
        console.log("\n=== Analisis del comando ===\n");
        console.log("  Comandos a ejecutar: " + commands.length);
        console.log(
          "  Tipos detectados: " +
            (cmdTypes.length > 0 ? cmdTypes.join(", ") : "general"),
        );
        console.log(
          "  Verificacion: " +
            (options.verify ? "habilitada" : "deshabilitada") +
            "\n",
        );
        console.log("  Comandos IOS modifican la configuracion del dispositivo.");
        console.log("  Use --plan para ver que se ejecutaria sin aplicar cambios.\n");
        return;
      }

      if (options.plan || globalPlan) {
        console.log("\n=== Plan de ejecucion ===\n");
        console.log("  Dispositivo: " + (device || "no seleccionado"));
        console.log("  Comandos: " + commands.length + "\n");
        commands.forEach((c: string, i: number) => {
          console.log("  " + (i + 1) + ". " + c);
        });
        console.log("\n  Verificacion: " + (options.verify ? "si" : "no") + "\n");
        return;
      }

      const verifyEnabled = options.verify ?? true;

      const flags = buildFlags({ verify: verifyEnabled });

      const payload: ConfigIOSPayload = {
        device: device || "",
        commands: commands || [],
        interactive: options.interactive,
      };

      const showOutputEnabled = (options as any).showOutput === true;

      const result = await runCommand<ConfigIOSResult>({
        action: "config-ios",
        meta: CONFIG_IOS_META,
        flags,
        payloadPreview: payload as unknown as Record<string, unknown>,
        execute: async (ctx): Promise<CliResult<ConfigIOSResult>> => {
          await ctx.controller.start();

          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);

            if (iosDevices.length === 0) {
              return createErrorResult<ConfigIOSResult>("config-ios", {
                message: "No hay dispositivos capaces de ejecutar IOS",
              });
            }

            let targetDevice = payload.device;
            if (!targetDevice) {
              return createErrorResult<ConfigIOSResult>("config-ios", {
                message:
                  "Debe especificar un dispositivo. Use pt devices para listar.",
              });
            }

            const selectedDevice = iosDevices.find(
              (d) => d.name === targetDevice,
            );
            if (!selectedDevice) {
              return createErrorResult<ConfigIOSResult>("config-ios", {
                message:
                  'Dispositivo "' +
                  targetDevice +
                  '" no encontrado o no es capaz de ejecutar IOS',
              });
            }

            if (payload.interactive) {
              return createSuccessResult<ConfigIOSResult>(
                "config-ios",
                {
                  device: targetDevice,
                  commands: [],
                  executed: 0,
                  errors: [],
                },
                {
                  advice: [
                    "Use el modo interactivo para ejecutar comandos uno por uno",
                  ],
                },
              );
            }

            if (payload.commands.length === 0) {
              return createErrorResult<ConfigIOSResult>("config-ios", {
                message: "Se requiere al menos un comando IOS",
              });
            }

            // Delegate to pt-control use case
            const useCaseResult = await applyConfigIOS(
              ctx.controller as unknown as PtControlConfigIOSControllerPort,
              {
                device: targetDevice,
                commands: payload.commands,
              },
              verifyEnabled,
            );

            if (!useCaseResult.ok) {
              return createErrorResult<ConfigIOSResult>(
                "config-ios",
                useCaseResult.error,
              );
            }

            const resultData: ConfigIOSResult = {
              device: targetDevice,
              commands: payload.commands,
              executed: payload.commands.length,
              errors: [],
              commandOutputs: showOutputEnabled
                ? useCaseResult.data.commandOutputs
                : undefined,
            };

            // Return verified result if verification was run
            if (useCaseResult.verification) {
              return createVerifiedResult<ConfigIOSResult>(
                "config-ios",
                resultData,
                useCaseResult.verification,
              );
            }

            return createSuccessResult<ConfigIOSResult>("config-ios", resultData, {
              advice: [
                "La configuración se aplicó, pero no hubo un plan de verificación específico.",
              ],
            });
          } finally {
            await ctx.controller.stop();
          }
        },
      });

      if (result.ok) {
        console.log(
          "\n" +
            chalk.green("*") +
            " " +
            result.data?.executed +
            " comando(s) ejecutado(s) en " +
            chalk.cyan(result.data?.device) +
            "\n",
        );

        if (result.data?.commandOutputs?.length) {
          console.log(chalk.bold("\n--- Output de comandos ---\n"));
          for (const cmdResult of result.data.commandOutputs) {
            const status = cmdResult.ok ? chalk.green("OK") : chalk.red("FAIL");
            console.log(
              chalk.cyan(
                `${cmdResult.index + 1}. [${status}] ${cmdResult.command}`,
              ),
            );
            if (cmdResult.output) {
              console.log(cmdResult.output.slice(0, 2000));
            }
            console.log();
          }
        }

        if (result.verification) {
          const status = result.verification.verified
            ? "verificado"
            : result.verification.partiallyVerified
              ? "parcialmente verificado"
              : "no verificado";
          console.log(chalk.bold(`Verificación: ${status}`));
        }
      } else {
        console.error(
          "\n" + chalk.red("X") + " Error: " + result.error?.message + "\n",
        );
        process.exit(1);
      }
    });

  return cmd;
}
