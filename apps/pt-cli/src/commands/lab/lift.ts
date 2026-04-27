#!/usr/bin/env bun
import { Command } from "commander";
import { readdir, unlink } from "node:fs/promises";

import {
  CORE3650_LIFT_SCENARIO_NAME,
  buildCore3650LiftPlanText,
  buildCore3650LiftScenarioPlan,
  executeCore3650LiftLab,
  type LabLiftControllerPort,
  type LabLiftResult,
  } from "@cisco-auto/pt-control/application/lab";

export { buildCore3650LiftScenarioPlan as buildScenarioPlan };

import { createVerifiedResult, createErrorResult } from "../../contracts/cli-result.js";
import type { CliResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import type { GlobalFlags } from "../../flags.js";
import { getGlobalFlags } from "../../flags.js";
import { formatExamples, formatRelatedCommands } from "../../help/formatter.ts";
import { getExamples } from "../../help/examples.ts";
import { getRelatedCommands } from "../../help/related.ts";
import { getCommandsDir, getInFlightDir, getResultsDir } from "../../system/paths.js";
import { renderCliResult } from "../../ux/renderers.ts";
import { runCommand } from "../../application/run-command.js";
import { buildFlags } from "../../flags-utils.js";

const LAB_LIFT_META: CommandMeta = {
  id: "lab.lift",
  summary: "Levanta el laboratorio core3650 completo",
  longDescription:
    "Crea la topología solicitada con un CORE3650, cuatro switches 2960, cuatro PCs y un servidor, y aplica VLANs, Rapid-PVST+, trunks, SVIs, DHCPv4 y direccionamiento base.",
  examples: [
    {
      command: "cisco-auto lab lift",
      description: "Levantar el laboratorio completo solicitado",
    },
  ],
  related: ["cisco-auto lab create", "cisco-auto lab validate", "cisco-auto status"],
  nextSteps: ["cisco-auto status", "cisco-auto device list"],
  tags: ["lab", "topology", "vlan", "dhcp", "routing", "stp"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function makeFlags(overrides: Partial<GlobalFlags> = {}): GlobalFlags {
  return buildFlags({
    verify: true,
    ...overrides,
  });
}

async function clearBridgeQueue(): Promise<void> {
  const dirs = [getCommandsDir(), getInFlightDir(), getResultsDir()];

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir);
      await Promise.all(
        entries
          .filter((entry) => entry.endsWith(".json"))
          .map((entry) => unlink(`${dir}/${entry}`)),
      );
    } catch {
      // Si el directorio no existe o no se puede leer,
      // no bloqueamos el despliegue del laboratorio.
    }
  }
}

export function createLabLiftCommand(): Command {
  const cmd = new Command("lift")
    .description("Levanta el laboratorio CORE3650 + 4x2960 + Server + 4 PCs")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan sin ejecutar", false)
    .option("--verify", "Verificar cambios post-ejecución", true)
    .option("--no-verify", "Omitir verificación post-ejecución", false)
    .action(async function (this: Command) {
      const globalExamples = process.argv.includes("--examples");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");
      const globalFlags = getGlobalFlags(this);

      const plan = buildCore3650LiftScenarioPlan();

      if (globalExamples) {
        console.log(
          formatExamples(getExamples("lab lift")) +
            formatRelatedCommands(getRelatedCommands("lab lift")),
        );
        return;
      }

      if (globalExplain) {
        console.log(LAB_LIFT_META.longDescription ?? LAB_LIFT_META.summary);
        return;
      }

      if (globalPlan) {
        console.log(buildCore3650LiftPlanText(plan));
        return;
      }

      const flags = makeFlags({
        json: globalFlags.json,
        jq: globalFlags.jq,
        output: globalFlags.output,
        verbose: globalFlags.verbose,
        quiet: globalFlags.quiet,
        trace: globalFlags.trace,
        tracePayload: globalFlags.tracePayload,
        traceResult: globalFlags.traceResult,
        traceDir: globalFlags.traceDir,
        traceBundle: globalFlags.traceBundle,
        traceBundlePath: globalFlags.traceBundlePath,
        sessionId: globalFlags.sessionId,
        examples: globalFlags.examples,
        schema: globalFlags.schema,
        explain: globalFlags.explain,
        plan: globalFlags.plan,
        verify: globalFlags.verify,
      });

      const result = await runCommand<LabLiftResult>({
        action: "lab.lift",
        meta: LAB_LIFT_META,
        flags,
        payloadPreview: {
          scenario: CORE3650_LIFT_SCENARIO_NAME,
          devices: plan.devices.length,
          links: plan.links.length,
        },
        execute: async (ctx): Promise<CliResult<LabLiftResult>> => {
          const execution = await executeCore3650LiftLab({
            controller: ctx.controller as unknown as LabLiftControllerPort,
            logPhase: ctx.logPhase,
            beforeClearBridgeQueue: clearBridgeQueue,
          });

          if (!execution.ok) {
            return createErrorResult("lab.lift", {
              message: execution.error.message,
              details: execution.error.details,
            }) as CliResult<LabLiftResult>;
          }

          return createVerifiedResult("lab.lift", execution.data, {
            verified: execution.verification.verified,
            partiallyVerified: execution.verification.partiallyVerified,
            checks: execution.verification.checks,
            warnings: execution.verification.warnings,
            verificationSource: execution.verification.verificationSource,
          }) as CliResult<LabLiftResult>;
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok && !flags.quiet) {
        console.log("\n✅ Laboratorio levantado");
      }

      if (!result.ok) {
        process.exit(1);
      }
    });

  const examples = getExamples("lab lift");
  const related = getRelatedCommands("lab lift");
  cmd.addHelpText("after", formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
