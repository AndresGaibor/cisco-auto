#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import { runCommand } from "../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../contracts/cli-result.js";
import { getGlobalFlags } from "../flags.js";

export function createSaveCommand(): Command {
  return new Command("save")
    .description("Ejecuta 'write memory' en dispositivos IOS")
    .argument("[device]", "Nombre del dispositivo")
    .option("--all", "Guardar en todos los dispositivos IOS", false)
    .action(async (deviceName: string | undefined, options, command) => {
      const flags = getGlobalFlags(command);

      if (!deviceName && !options.all) {
        console.error(chalk.red("\n✖ Debes especificar un dispositivo o usar --all"));
        process.exit(1);
      }

      const wrapped = await runCommand({
        action: "cmd.save",
        meta: {
          id: "cmd.save",
          summary: "Guardar configuración",
          examples: [],
          related: ["cmd"],
          tags: ["save", "config"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { deviceName, all: options.all },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `save-${Date.now()}`,
          });

          const devicesToSave: string[] = [];
          if (options.all) {
            const devices = await ctx.controller.listDevices();
            for (const d of devices) {
              if (d.type === "router" || d.type === "switch" || d.type === "multilayer_device") {
                devicesToSave.push(d.name);
              }
            }
          } else if (deviceName) {
            devicesToSave.push(deviceName);
          }

          const results = [];
          for (const device of devicesToSave) {
            const res = await service.executeCommand(device, "write memory", {
              mode: "safe",
              timeoutMs: 15000,
            });
            results.push({ device, ok: res.ok, output: res.output });
          }

          const allOk = results.every(r => r.ok);
          if (!allOk) {
              return createErrorResult("cmd.save", {
                  code: "SAVE_FAILED",
                  message: "Uno o más dispositivos fallaron al guardar",
                  details: { results }
              });
          }

          return createSuccessResult("cmd.save", { results });
        }
      });

      if (flags.json) {
        process.stdout.write(`${JSON.stringify(wrapped, null, 2)}\n`);
      } else if (wrapped.ok) {
        console.log(chalk.green(`\n✓ Configuración guardada en ${deviceName || "todos los dispositivos"}`));
      } else {
        console.error(chalk.red(`\n✖ Error al guardar: ${wrapped.error?.message}`));
      }
      
      if (!wrapped.ok) process.exitCode = 1;
    });
}
