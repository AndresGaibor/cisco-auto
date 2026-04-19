#!/usr/bin/env bun
/**
 * Comando ping - Verifica conectividad entre dispositivos
 *
 * Ejecuta ping desde un dispositivo hacia una IP o hacia otro dispositivo.
 * Detecta automáticamente la IP destino si se pasa un nombre de dispositivo.
 */

import { Command } from "commander";
import chalk from "chalk";

import type { CliResult } from "../contracts/cli-result.js";
import {
  createSuccessResult,
  createErrorResult,
  createVerifiedResult,
} from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";
import type { GlobalFlags } from "../flags.js";

import { runCommand } from "../application/run-command.js";
import { fetchDeviceList } from "../utils/device-utils.js";

export const PING_META: CommandMeta = {
  id: "ping",
  summary: "Verificar conectividad entre dispositivos usando ping",
  longDescription:
    "Ejecuta un ping desde un dispositivo hacia una IP destino o hacia otro dispositivo de la topología. Si se especifica un nombre de dispositivo como destino, se detectará automáticamente su IP. Muestra latencia, pérdida de paquetes y estado de la conectividad.",
  examples: [
    { command: "pt ping PC1 192.168.10.20", description: "Ping desde PC1 hacia IP específica" },
    {
      command: "pt ping PC1 PC2",
      description: "Ping desde PC1 hacia PC2 (detecta IP automáticamente)",
    },
    { command: "pt ping PC1 192.168.10.1 --count 5", description: "Ping con 5 paquetes" },
  ],
  related: ["device get", "show ip-int-brief", "diagnose ping-fails"],
  nextSteps: ["pt device get <from>", "pt show mac <switch>"],
  tags: ["network", "connectivity", "ping", "diagnose"],
  supportsVerify: true,
  supportsJson: true,
  supportsExplain: true,
};

interface PingResult {
  from: string;
  to: string;
  success: boolean;
  latency?: number;
  packetLoss?: number;
  packetsSent?: number;
  packetsReceived?: number;
  error?: string;
}

export function createPingCommand(): Command {
  return new Command("ping")
    .description("Verificar conectividad entre dispositivos usando ping")
    .argument("<from>", "Dispositivo origen del ping")
    .argument("<to>", "IP destino o nombre de dispositivo destino")
    .option("--count <n>", "Número de paquetes a enviar", "4")
    .option("--timeout <ms>", "Timeout en milisegundos", "5000")
    .option("--examples", "Mostrar ejemplos de uso")
    .option("--schema", "Mostrar schema del resultado")
    .option("--explain", "Explicar qué hace el comando")
    .option("-j, --json", "Salida en formato JSON")
    .option("-o, --output <format>", "Formato de salida (json|yaml|table|text)", "text")
    .action(async (from: string, to: string, options: Record<string, unknown>) => {
      if (options.examples) {
        console.log("Ejemplos de uso:");
        PING_META.examples.forEach((ex) => {
          console.log(`  ${chalk.cyan(ex.command)}`);
          console.log(`    → ${ex.description}`);
        });
        return;
      }

      if (options.schema) {
        console.log(
          JSON.stringify(
            {
              type: "object",
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                success: { type: "boolean" },
                latency: { type: "number" },
                packetLoss: { type: "number" },
                packetsSent: { type: "number" },
                packetsReceived: { type: "number" },
              },
            },
            null,
            2,
          ),
        );
        return;
      }

      if (options.explain) {
        console.log(PING_META.longDescription);
        return;
      }

      const flags: GlobalFlags = {
        json: Boolean(options.json),
        jq: null,
        output: (options.output as GlobalFlags["output"]) || "text",
        verbose: false,
        quiet: false,
        trace: false,
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
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand<PingResult>({
        action: "ping",
        meta: PING_META,
        flags,
        payloadPreview: { from, to, count: options.count },
        execute: async (ctx) => {
          await ctx.controller.start();

          try {
            const count = parseInt(options.count as string) || 4;
            const timeout = parseInt(options.timeout as string) || 5000;

            const devices = await fetchDeviceList(ctx.controller);

            const fromDevice = devices.find((d) => d.name === from);
            if (!fromDevice) {
              return createErrorResult("ping", {
                message: `Dispositivo '${from}' no encontrado en la topología`,
              });
            }

            let targetIp = to;
            const toDevice = devices.find((d) => d.name === to);
            if (toDevice) {
              const port = toDevice.ports?.find((p) => p.ipAddress && p.ipAddress !== "0.0.0.0");
              if (port?.ipAddress) {
                targetIp = port.ipAddress;
              } else {
                return createErrorResult("ping", {
                  message: `Dispositivo '${to}' no tiene IP configurada`,
                });
              }
            }

            if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetIp)) {
              return createErrorResult("ping", {
                message: `IP '${targetIp}' no tiene formato válido`,
              });
            }

            await ctx.logPhase("ping", { from, to: targetIp });

            const pingResult = await performPing(ctx.controller, from, targetIp, count, timeout);

            return createVerifiedResult("ping", pingResult, {
              executed: true,
              verified: pingResult.success,
              checks: [
                {
                  name: "ping-success",
                  ok: pingResult.success,
                  details: { latency: pingResult.latency },
                },
                {
                  name: "packet-loss",
                  ok: (pingResult.packetLoss ?? 100) === 0,
                  details: { loss: pingResult.packetLoss },
                },
              ],
            });
          } finally {
            await ctx.controller.stop();
          }
        },
      });

      if (result.ok && result.data) {
        if (flags.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          renderPingResult(result.data);
        }
      } else {
        console.error(`${chalk.red("✗")} Error: ${result.error?.message}`);
        process.exit(1);
      }
    });
}

async function performPing(
  controller: any,
  fromDevice: string,
  toIp: string,
  count: number,
  timeout: number,
): Promise<PingResult> {
  try {
    const result = await controller.omniscience.sendPing(fromDevice, toIp);
    
    return {
      from: fromDevice,
      to: toIp,
      success: result.success,
      packetsSent: count,
      packetsReceived: result.success ? count : 0,
      packetLoss: result.success ? 0 : 100,
      raw: result.raw
    };
  } catch (error: any) {
    return {
      from: fromDevice,
      to: toIp,
      success: false,
      error: error.message || "Ping failed",
      packetLoss: 100,
      packetsSent: count,
      packetsReceived: 0,
    };
  }
}

function renderPingResult(result: PingResult): void {
  if (result.raw) {
      console.log(chalk.bold.cyan(`\n📟 SALIDA DE CONSOLA (${result.from}):`));
      console.log(chalk.gray(result.raw));
  }

  if (result.success) {
    console.log(chalk.green(`\n✓ Conectividad verificada: ${result.from} → ${result.to}`));
  } else {
    console.log(chalk.red(`\n✗ Fallo de conectividad: ${result.from} → ${result.to}`));
    if (result.error) console.log(`  Error: ${result.error}`);
  }
}
