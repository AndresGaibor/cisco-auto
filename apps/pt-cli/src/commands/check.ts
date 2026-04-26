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
import {
  validateLanBasic,
  validateGateway,
  type CheckResult,
  type CheckResultItem,
} from "@cisco-auto/pt-control/application/check";

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

const SCENARIOS: Record<
  string,
  {
    description: string;
    validate: (
      controller: CheckControllerPort,
      scenario: string,
      fix: boolean,
    ) => Promise<CheckResultItem[]>;
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

// Re-export CheckControllerPort for SCENARIOS typing
interface CheckControllerPort {
  listDevices(): Promise<{ devices: unknown[] } | unknown[]>;
  inspectDevice(name: string): Promise<unknown>;
  sendPing(source: string, target: string, timeoutMs?: number): Promise<{ success: boolean; raw?: string }>;
}

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
            const checks = await scenarioDef.validate(ctx.controller, scenario, fix);

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