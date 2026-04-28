#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";

import type { CliResult } from "../../contracts/cli-result.js";
import { createSuccessResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import { runCommand } from "../../application/run-command.js";
import { renderCommandResult } from "../../application/render-command-result.js";
import { verifyLink, type LinkVerificationData } from "../../application/verify-link.js";
import { flagsFromCommand } from "../../flags-utils.js";
import { parseLinkEndpointArgs } from "../../utils/link-endpoint-parser.js";

interface LinkDiagnosisResult {
  requested: {
    device: string;
    port?: string;
    device2?: string;
    port2?: string;
  };
  diagnosis: LinkVerificationData | { state: "device"; advice: string[]; connected: false; verified: false };
}

export const LINK_DOCTOR_META: CommandMeta = {
  id: "link.doctor",
  summary: "Diagnosticar por qué un link no está verde",
  longDescription: "Diagnostica un enlace live y muestra pistas sobre por qué no está operativo.",
  examples: [
    {
      command: "bun run pt link doctor R1:Gi0/0 S1:Fa0/1 --json",
      description: "Diagnosticar un enlace en JSON",
    },
  ],
  related: ["bun run pt link verify", "bun run pt link add"],
  nextSteps: ["bun run pt link list --json"],
  tags: ["link", "doctor", "diagnostic"],
  supportsJson: true,
};

export function createLinkDoctorCommand(): Command {
  return new Command("doctor")
    .description("Diagnosticar por qué un link no está verde")
    .argument("[endpointOrDevice1]", "R1:Gi0/0 o R1")
    .argument("[endpointOrPort1]", "S1:Fa0/1 o Gi0/0")
    .argument("[device2]", "S1 si usas formato de 4 argumentos")
    .argument("[port2]", "Fa0/1 si usas formato de 4 argumentos")
    .option("--json", "Salida JSON", false)
    .action(async (arg1, arg2, arg3, arg4, options, command) => {
      const flags = flagsFromCommand(command);
      const values = [arg1, arg2, arg3, arg4].filter(Boolean);
      const singleValue = values.length === 1 ? String(values[0]) : "";
      const deviceOnly = values.length === 1;
      const endpoints = deviceOnly && singleValue.includes(":")
        ? (() => {
            const [device, port = ""] = singleValue.split(":");
            return { a: { device, port }, b: { device: "", port: "" } };
          })()
        : deviceOnly
          ? { a: { device: singleValue, port: "" }, b: { device: "", port: "" } }
          : parseLinkEndpointArgs(values);
      const deviceA = String(endpoints.a.device ?? "");
      const portA = String(endpoints.a.port ?? "");
      const deviceB = String(endpoints.b.device ?? "");
      const portB = String(endpoints.b.port ?? "");

      const result = await runCommand<LinkDiagnosisResult>({
        action: "link.doctor",
        meta: LINK_DOCTOR_META,
        flags,
        payloadPreview: {
          device: deviceA,
          port: portA,
          device2: deviceB,
          port2: portB,
        },
        execute: async ({ controller }): Promise<CliResult<LinkDiagnosisResult>> => {
          if (deviceOnly) {
            return createSuccessResult<LinkDiagnosisResult>("link.doctor", {
              requested: { device: deviceA },
              diagnosis: {
                state: "device",
                advice: ["Indica también el puerto para diagnosticar un enlace exacto."],
                connected: false,
                verified: false,
              },
            });
          }

          const verification = await verifyLink(
            controller,
            deviceA,
            portA,
            deviceB,
            portB,
          );

          return createSuccessResult<LinkDiagnosisResult>("link.doctor", {
            requested: {
              device: deviceA,
              port: portA,
              device2: deviceB,
              port2: portB,
            },
            diagnosis: verification,
          });
        },
      });

      if (!options.json) {
        console.log(chalk.bold("\n🩺 Diagnóstico de link\n"));
      }

      renderCommandResult({ result, flags });
    });
}
