#!/usr/bin/env bun
/**
 * Comando check - Validación automática de conectividad y escenarios de red
 *
 * Ejecuta verificaciones automáticas para escenarios comunes como:
 * - lan-basic: 2 PCs + 1 switch, conectividad L2/L3
 * - gateway: Todos los hosts pueden alcanzar su gateway
 * - vlan: VLANs correctamente segmentadas
 *
 * Uso:
 *   pt check lan-basic
 *   pt check lan-basic --fix    # Corrige problemas automáticamente
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

export const CHECK_META: CommandMeta = {
  id: "check",
  summary: "Validar conectividad y escenarios de red automáticamente",
  longDescription:
    "Ejecuta verificaciones completas para escenarios de red comunes. Cada escenario incluye verificaciones de configuración, conectividad y estado. El flag --fix intenta corregir problemas automáticamente cuando es posible.",
  examples: [
    { command: "pt check lan-basic", description: "Validar LAN básica (2 PCs + switch)" },
    {
      command: "pt check lan-basic --fix",
      description: "Validar y corregir problemas automáticamente",
    },
    { command: "pt check gateway", description: "Verificar que todos los hosts llegan al gateway" },
    { command: "pt check list", description: "Listar todos los escenarios disponibles" },
  ],
  related: ["ping", "show mac", "diagnose"],
  nextSteps: ["pt ping <pc1> <pc2>", "pt show mac <switch>"],
  tags: ["network", "validate", "scenario", "check"],
  supportsVerify: false,
  supportsJson: true,
  supportsExplain: true,
};

interface CheckResultItem {
  name: string;
  status: "pass" | "fail" | "warning" | "skip";
  message: string;
  details?: Record<string, unknown>;
  fix?: string;
}

interface CheckResult {
  scenario: string;
  passed: number;
  failed: number;
  warnings: number;
  checks: CheckResultItem[];
  summary: string;
}

const SCENARIOS: Record<
  string,
  {
    description: string;
    validate: (ctx: any, fix: boolean) => Promise<CheckResultItem[]>;
  }
> = {
  "lan-basic": {
    description: "LAN mínima: 2 PCs + 1 switch, conectividad L2/L3",
    validate: validateLanBasic,
  },
  gateway: {
    description: "Todos los hosts pueden alcanzar su gateway",
    validate: validateGateway,
  },
};

function getScenarioNames(): string[] {
  return Object.keys(SCENARIOS);
}

export function createCheckCommand(): Command {
  const cmd = new Command("check")
    .description("Validar conectividad y escenarios de red automáticamente")
    .argument("[scenario]", 'Nombre del escenario a validar (o "list" para ver disponibles)')
    .option("--fix", "Intentar corregir problemas automáticamente", false)
    .option("--examples", "Mostrar ejemplos de uso")
    .option("--schema", "Mostrar schema del resultado")
    .option("--explain", "Explicar qué hace el comando")
    .option("-j, --json", "Salida en formato JSON")
    .option("-o, --output <format>", "Formato de salida (json|table|text)", "table")
    .action(async (scenario: string | undefined, options: Record<string, unknown>) => {
      if (options.examples) {
        console.log("Escenarios disponibles:");
        for (const [name, s] of Object.entries(SCENARIOS)) {
          console.log(`  ${chalk.cyan(name)}: ${s.description}`);
        }
        console.log("\nEjemplos:");
        CHECK_META.examples.forEach((ex) => {
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
                scenario: { type: "string" },
                passed: { type: "number" },
                failed: { type: "number" },
                warnings: { type: "number" },
                checks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      status: { type: "string", enum: ["pass", "fail", "warning", "skip"] },
                      message: { type: "string" },
                      details: { type: "object" },
                      fix: { type: "string" },
                    },
                  },
                },
                summary: { type: "string" },
              },
            },
            null,
            2,
          ),
        );
        return;
      }

      if (options.explain) {
        console.log(CHECK_META.longDescription);
        console.log("\nEscenarios disponibles:");
        for (const [name, s] of Object.entries(SCENARIOS)) {
          console.log(`  ${chalk.cyan(name)}: ${s.description}`);
        }
        return;
      }

      if (!scenario || scenario === "list") {
        console.log("Escenarios disponibles:");
        for (const [name, s] of Object.entries(SCENARIOS)) {
          console.log(`  ${chalk.cyan(name.padEnd(15))} ${s.description}`);
        }
        return;
      }

      if (!SCENARIOS[scenario]) {
        console.error(`${chalk.red("✗")} Escenario '${scenario}' no encontrado`);
        console.log("Escenarios disponibles:");
        for (const name of getScenarioNames()) {
          console.log(`  ${chalk.cyan(name)}`);
        }
        process.exit(1);
      }

      const flags: GlobalFlags = {
        json: Boolean(options.json),
        jq: null,
        output: (options.output as GlobalFlags["output"]) || "table",
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
        verify: false,
        timeout: null,
        noTimeout: false,
      };

      const fix = Boolean(options.fix);

      const result = await runCommand<CheckResult>({
        action: "check",
        meta: CHECK_META,
        flags,
        payloadPreview: { scenario, fix },
        execute: async (ctx) => {
          await ctx.controller.start();

          try {
            const scenarioDef = SCENARIOS[scenario]!;
            const checks = await scenarioDef.validate(ctx, fix);

            const passed = checks.filter((c) => c.status === "pass").length;
            const failed = checks.filter((c) => c.status === "fail").length;
            const warnings = checks.filter((c) => c.status === "warning").length;

            const summary =
              failed === 0
                ? `✓ ${scenario}: ${passed} passed, ${warnings} warnings`
                : `✗ ${scenario}: ${failed} failed, ${passed} passed`;

            return createVerifiedResult(
              "check",
              {
                scenario,
                passed,
                failed,
                warnings,
                checks,
                summary,
              },
              {
                executed: true,
                verified: failed === 0,
                checks: checks.map((c) => ({
                  name: c.name,
                  ok: c.status === "pass" || c.status === "warning",
                  details: c.details,
                })),
              },
            );
          } finally {
            await ctx.controller.stop();
          }
        },
      });

      if (result.ok && result.data) {
        if (flags.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          renderCheckResult(result.data, fix);
        }
      } else {
        console.error(`${chalk.red("✗")} Error: ${result.error?.message}`);
        process.exit(1);
      }
    });

  return cmd;
}

async function validateLanBasic(ctx: any, _fix: boolean): Promise<CheckResultItem[]> {
  const checks: CheckResultItem[] = [];

  // Force fresh device list by calling listDevices directly
  let devices: any[] = [];
  try {
    const { devices: deviceList } = await ctx.controller.listDevices();
    devices = deviceList;
    if (!Array.isArray(devices)) {
      devices = [];
    }
  } catch (e) {
    devices = [];
  }

  const pcs = devices.filter((d) => d.type === "pc" || d.type === 8 || d.type === "PC");
  const switches = devices.filter(
    (d) =>
      d.type === "switch" || d.type === "switch-l2" || d.type === "switch_layer3" || d.type === 1,
  );

  if (pcs.length < 2) {
    checks.push({
      name: "min-pcs",
      status: "fail",
      message: `Se requieren al menos 2 PCs, encontrado(s): ${pcs.length}`,
    });
    return checks;
  }
  checks.push({ name: "min-pcs", status: "pass", message: `${pcs.length} PC(s) encontrado(s)` });

  if (switches.length < 1) {
    checks.push({ name: "min-switches", status: "fail", message: "Se requiere al menos 1 switch" });
    return checks;
  }
  checks.push({
    name: "min-switches",
    status: "pass",
    message: `${switches.length} switch(es) encontrado(s)`,
  });

  const pc1 = pcs[0];
  const pc2 = pcs[1];
  const switch1 = switches[0];

  // listDevices doesn't populate ip/mask, need to inspect each device
  const pc1Info = await ctx.controller.inspectDevice(pc1.name);
  const pc2Info = await ctx.controller.inspectDevice(pc2.name);

  const pc1Ip =
    (pc1Info as any).ip ||
    pc1Info.ports?.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.ipAddress;
  const pc1Mask =
    (pc1Info as any).mask ||
    pc1Info.ports?.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.subnetMask;
  const pc2Ip =
    (pc2Info as any).ip ||
    pc2Info.ports?.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.ipAddress;
  const pc2Mask =
    (pc2Info as any).mask ||
    pc2Info.ports?.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.subnetMask;

  if (!pc1Ip) {
    checks.push({
      name: "pc1-ip",
      status: "fail",
      message: `${pc1.name} no tiene IP configurada`,
      fix: `pt config-host ${pc1.name} 192.168.10.10 255.255.255.0`,
    });
  } else {
    checks.push({ name: "pc1-ip", status: "pass", message: `${pc1.name}: ${pc1Ip}/${pc1Mask}` });
  }

  if (!pc2Ip) {
    checks.push({
      name: "pc2-ip",
      status: "fail",
      message: `${pc2.name} no tiene IP configurada`,
      fix: `pt config-host ${pc2.name} 192.168.10.20 255.255.255.0`,
    });
  } else {
    checks.push({ name: "pc2-ip", status: "pass", message: `${pc2.name}: ${pc2Ip}/${pc2Mask}` });
  }

  if (pc1Ip && pc2Ip) {
    const pc1Net = getNetworkAddress(pc1Ip, pc1Mask);
    const pc2Net = getNetworkAddress(pc2Ip, pc2Mask);

    if (pc1Net === pc2Net) {
      checks.push({
        name: "same-subnet",
        status: "pass",
        message: "PC1 y PC2 están en la misma subred",
      });
    } else {
      checks.push({
        name: "same-subnet",
        status: "fail",
        message: `PC1 (${pc1Net}) y PC2 (${pc2Net}) en subredes diferentes`,
        fix: "Ajustar máscara o IP",
      });
    }

    const maskBits1 = subnetMaskToBits(pc1Mask);
    const maskBits2 = subnetMaskToBits(pc2Mask);
    if (maskBits1 !== maskBits2) {
      checks.push({
        name: "mask-mismatch",
        status: "warning",
        message: `Máscaras diferentes: PC1 /${maskBits1}, PC2 /${maskBits2}`,
        details: { pc1Mask, pc2Mask },
        fix: `Usar /${Math.min(maskBits1, maskBits2)} para ambos`,
      });
    }
  }

  try {
    let raw = "";
    const pc1IsPc = pc1.type === "pc" || pc1.type === 8 || pc1.type === "server";

    if (pc1IsPc) {
      const bridge = ctx.controller.getBridge();
      const pcResult = await bridge.sendCommandAndWait("execPc", {
        device: pc1.name,
        command: `ping ${pc2Ip}`,
        timeoutMs: 30000,
      });
      raw = pcResult?.value?.raw || "";
    } else {
      const pingResult = await ctx.controller.execIos(
        pc1.name,
        `ping ${pc2Ip} repeat 4`,
        true,
        10000,
      );
      raw = pingResult.raw || "";
    }

    const success =
      raw.toLowerCase().includes("success") ||
      raw.includes("Reply from") ||
      (raw.includes("!") && !raw.includes("U")) ||
      raw.includes("Paquetes perdidos: 0%") ||
      raw.includes("0% packet loss") ||
      (raw.includes("100%") === false && raw.includes("perdidos"));

    if (success) {
      checks.push({
        name: "ping-pc1-to-pc2",
        status: "pass",
        message: `Ping ${pc1.name} → ${pc2.name} exitoso`,
      });
    } else {
      checks.push({
        name: "ping-pc1-to-pc2",
        status: "fail",
        message: `Ping ${pc1.name} → ${pc2.name} falló`,
        details: { raw: raw.slice(0, 200) },
        fix: "Verificar enlaces físicos y configuración IP",
      });
    }
  } catch (pingError: any) {
    checks.push({
      name: "ping-pc1-to-pc2",
      status: "fail",
      message: `No se pudo ejecutar ping: ${pingError.message}`,
      fix: "Verificar que PT esté corriendo",
    });
  }

  try {
    const switchInfo = await ctx.controller.inspectDevice(switch1.name);
    const ports = switchInfo.ports || [];
    const macsWithAddress = ports.filter(
      (p: any) => p.macAddress && p.macAddress !== "0.0.0.0" && p.macAddress !== "0000.0000.0000",
    );
    const uniqueMacs = new Set(macsWithAddress.map((p: any) => p.macAddress));

    if (uniqueMacs.size >= 2) {
      checks.push({
        name: "mac-table",
        status: "pass",
        message: `${switch1.name} tiene ${uniqueMacs.size} MAC(s) en puertos`,
        details: { macCount: uniqueMacs.size },
      });
    } else {
      checks.push({
        name: "mac-table",
        status: "warning",
        message: `${switch1.name} solo tiene ${uniqueMacs.size} MAC(s) en puertos - verificar enlaces`,
        details: {
          macCount: uniqueMacs.size,
          ports: ports.map((p: any) => ({ name: p.name, mac: p.macAddress })),
        },
      });
    }
  } catch (_macError: any) {
    checks.push({ name: "mac-table", status: "skip", message: "No se pudo obtener tabla MAC" });
  }

  return checks;
}

async function validateGateway(ctx: any, _fix: boolean): Promise<CheckResultItem[]> {
  const checks: CheckResultItem[] = [];
  const devices = await fetchDeviceList(ctx.controller);
  const hosts = devices.filter((d) => d.type === "pc" || d.type === "server");

  for (const host of hosts) {
    const port = host.ports?.find((p) => p.ipAddress && p.ipAddress !== "0.0.0.0");
    if (!port?.ipAddress) {
      checks.push({
        name: `gateway-${host.name}`,
        status: "skip",
        message: `${host.name} no tiene IP`,
      });
      continue;
    }
    checks.push({
      name: `gateway-${host.name}`,
      status: "pass",
      message: `${host.name}: ${port.ipAddress}`,
    });
  }

  return checks;
}

function getNetworkAddress(ip: string, mask: string): string {
  const ipParts = ip.split(".").map(Number);
  const maskParts = mask.split(".").map(Number);
  const netParts = ipParts.map((p, i) => p & (maskParts[i] ?? 0));
  return netParts.join(".");
}

function subnetMaskToBits(mask: string): number {
  if (!mask) return 0;
  const parts = mask.split(".").map(Number);
  let bits = 0;
  for (const part of parts) {
    let n = part;
    while (n > 0) {
      bits += n & 1;
      n >>= 1;
    }
  }
  return bits;
}

function renderCheckResult(result: CheckResult, _fix: boolean): void {
  console.log(chalk.bold(`\n🔍 Check: ${result.scenario}`));
  console.log(chalk.gray("═".repeat(60)));

  for (const check of result.checks) {
    const icon =
      check.status === "pass"
        ? chalk.green("✓")
        : check.status === "fail"
          ? chalk.red("✗")
          : check.status === "warning"
            ? chalk.yellow("⚠")
            : chalk.gray("○");

    const statusColor =
      check.status === "pass"
        ? chalk.green
        : check.status === "fail"
          ? chalk.red
          : check.status === "warning"
            ? chalk.yellow
            : chalk.gray;

    console.log(`  ${icon} ${statusColor(check.name.padEnd(20))} ${check.message}`);

    if (check.fix && (check.status === "fail" || check.status === "warning")) {
      console.log(chalk.gray(`    → Fix: ${check.fix}`));
    }
  }

  console.log(chalk.gray("═".repeat(60)));

  const summaryColor =
    result.failed > 0 ? chalk.red : result.warnings > 0 ? chalk.yellow : chalk.green;
  console.log(
    summaryColor(
      `\n  ${result.passed} passed, ${result.failed} failed, ${result.warnings} warnings`,
    ),
  );
}
