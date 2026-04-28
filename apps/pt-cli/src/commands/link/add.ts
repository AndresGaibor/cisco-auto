#!/usr/bin/env bun

import { Command } from "commander";

import type { CliResult } from "../../contracts/cli-result.js";
import { createErrorResult, createSuccessResult, createVerifiedResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import { runCommand } from "../../application/run-command.js";
import { renderCommandResult } from "../../application/render-command-result.js";
import { verifyLink, buildLinkVerificationChecks, type LinkVerificationData } from "../../application/verify-link.js";
import { flagsFromCommand, flagEnabled } from "../../flags-utils.js";
import { parseLinkEndpointArgs } from "../../utils/link-endpoint-parser.js";

interface LinkAddResult {
  requested: {
    device1: string;
    port1: string;
    device2: string;
    port2: string;
    cableType: string;
  };
  created: {
    id?: string;
    device1?: string;
    port1?: string;
    device2?: string;
    port2?: string;
    cableType?: string;
    state?: string;
  } | null;
  verification?: LinkVerificationData | null;
}

export const LINK_ADD_META: CommandMeta = {
  id: "link.add",
  summary: "Crear un enlace físico live entre dos puertos de Packet Tracer",
  longDescription:
    "Crea un enlace físico live entre dos puertos exactos de Packet Tracer. Por defecto verifica después de crear; usa --no-verify para un fast-path de un solo round-trip.",
  examples: [
    {
      command: "bun run pt link add PC1:FastEthernet0 SW1:FastEthernet0/1 --no-verify",
      description: "Crear enlace rápido sin verificación posterior",
    },
    {
      command: "bun run pt link add R1:Gi0/0 S1:Fa0/1 --type straight --verify",
      description: "Crear enlace y verificarlo",
    },
    {
      command: "bun run pt link add R1 Gi0/0 S1 Fa0/1 --replace --no-verify",
      description: "Crear enlace usando formato de 4 argumentos y reemplazar si el puerto está ocupado",
    },
  ],
  related: [
    "bun run pt link list",
    "bun run pt link verify",
    "bun run pt device list",
  ],
  nextSteps: [
    "bun run pt link verify <dev1>:<port1> <dev2>:<port2>",
    "bun run pt device list --json",
  ],
  tags: ["link", "cable", "topology"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
};

function toCableType(value: string): string {
  const raw = String(value ?? "auto").trim().toLowerCase().replace(/_/g, "-");
  const aliases: Record<string, string> = {
    auto: "auto",
    straight: "straight",
    "straight-through": "straight",
    "copper-straight": "straight",
    "copper-straight-through": "straight",
    cross: "cross",
    crossover: "cross",
    "cross-over": "cross",
    "copper-cross": "cross",
    "copper-crossover": "cross",
    serial: "serial",
    console: "console",
    fiber: "fiber",
    phone: "phone",
    coaxial: "coaxial",
    cable: "cable",
    usb: "usb",
    wireless: "wireless",
    roll: "roll",
    rollover: "roll",
  };

  return aliases[raw] ?? raw;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEndpoint(device: string, port: string): string {
  return `${device}:${port}`;
}

async function waitForGreen(
  controller: Parameters<typeof verifyLink>[0],
  endpoints: { device1: string; port1: string; device2: string; port2: string },
  timeoutMs: number,
): Promise<LinkVerificationData> {
  const startedAt = Date.now();
  let last = await verifyLink(controller, endpoints.device1, endpoints.port1, endpoints.device2, endpoints.port2);

  while (Date.now() - startedAt < timeoutMs) {
    if (last.linkUp) {
      return last;
    }

    await sleep(500);
    last = await verifyLink(controller, endpoints.device1, endpoints.port1, endpoints.device2, endpoints.port2);
  }

  return last;
}

export function createLinkAddCommand(): Command {
  return new Command("add")
    .description("Crear un enlace físico live entre dos puertos de Packet Tracer")
    .argument("[endpointOrDevice1]", "R1:Gi0/0 o R1")
    .argument("[endpointOrPort1]", "S1:Fa0/1 o Gi0/0")
    .argument("[device2]", "S1 si usas formato de 4 argumentos")
    .argument("[port2]", "Fa0/1 si usas formato de 4 argumentos")
    .option("-t, --type <type>", "Cable: auto, straight, cross, serial, console, fiber", "auto")
    .option("--replace", "Si un puerto está ocupado, elimina el enlace existente antes de crear el nuevo", false)
    .option("--allow-auto-fallback", "Permite autoConnectDevices si createLink exacto falla", false)
    .option("--wait-green <ms>", "Esperar hasta que el link quede verde", "0")
    .option("--verify", "Verificar live después de crear")
    .option("--no-verify", "No verificar después de crear")
    .option("--json", "Salida JSON", false)
    .option("--plan", "Mostrar plan sin mutar Packet Tracer", false)
    .action(async (arg1, arg2, arg3, arg4, options, command) => {
      const globalExamples = process.argv.includes("--examples");
      const globalSchema = process.argv.includes("--schema");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      const verifyEnabled = flagEnabled(options.verify, {
        defaultValue: true,
        positive: "--verify",
        negative: "--no-verify",
      });

      const flags = flagsFromCommand(command, {
        verify: verifyEnabled,
      });

      if (globalExamples) {
        console.log(JSON.stringify(LINK_ADD_META.examples, null, 2));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(LINK_ADD_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(LINK_ADD_META.longDescription ?? LINK_ADD_META.summary);
        return;
      }

      const endpoints = parseLinkEndpointArgs([arg1, arg2, arg3, arg4].filter(Boolean));
      const cableType = toCableType(options.type);
      const waitGreenMs = Number(options.waitGreen ?? 0);

      if (!endpoints.b.device || !endpoints.b.port) {
        const result = createErrorResult<LinkAddResult>("link.add", {
          code: "MISSING_ENDPOINT",
          message: "Debes indicar ambos extremos del enlace.",
          details: {
            received: [arg1, arg2, arg3, arg4].filter(Boolean),
            examples: [
              "pt link add R1:Gi0/0 S1:Fa0/1",
              "pt link add R1 Gi0/0 S1 Fa0/1",
            ],
          },
        });

        renderCommandResult({ result, flags });
        return;
      }

      const requested = {
        device1: endpoints.a.device,
        port1: endpoints.a.port,
        device2: endpoints.b.device,
        port2: endpoints.b.port,
        cableType,
      };

      if (globalPlan) {
        const result = createSuccessResult<LinkAddResult>("link.add", {
          requested,
          created: null,
        }, {
          advice: [
            `Crearía enlace ${formatEndpoint(requested.device1, requested.port1)} ↔ ${formatEndpoint(requested.device2, requested.port2)}.`,
            `Cable: ${cableType}.`,
            verifyEnabled
              ? `Después verificaría el enlace${waitGreenMs > 0 ? ` y esperaría verde hasta ${waitGreenMs}ms` : ""}.`
              : "No verificaría después porque usaste --no-verify.",
          ],
        });

        renderCommandResult({ result, flags });
        return;
      }

      const result = await runCommand<LinkAddResult>({
        action: "link.add",
        meta: LINK_ADD_META,
        flags,
        payloadPreview: {
          ...requested,
          replaceExisting: Boolean(options.replace),
          allowAutoFallback: Boolean(options.allowAutoFallback),
          verify: verifyEnabled,
          waitGreenMs,
        },
        execute: async (ctx): Promise<CliResult<LinkAddResult>> => {
          const { controller, logPhase } = ctx;

          await logPhase("apply", requested);

          const primitive = await controller.getBridge().sendCommandAndWait<{
            id?: string;
            device1?: string;
            port1?: string;
            device2?: string;
            port2?: string;
            state?: string;
            cableType?: string;
          }>("link.add", {
            type: "addLink",
            device1: requested.device1,
            port1: requested.port1,
            device2: requested.device2,
            port2: requested.port2,
            linkType: cableType,
            cableType,
            strictPorts: true,
            allowAutoFallback: Boolean(options.allowAutoFallback),
            replaceExisting: Boolean(options.replace),
          });

          if (!primitive.ok) {
            const message =
              typeof primitive.error === "string"
                ? primitive.error
                : primitive.error && typeof primitive.error === "object" && "message" in primitive.error
                  ? String((primitive.error as { message?: unknown }).message ?? "No se pudo crear el enlace.")
                  : "No se pudo crear el enlace.";

            return createErrorResult<LinkAddResult>("link.add", {
              code: "LINK_ADD_FAILED",
              message,
              details: {
                requested,
                bridgeResult: primitive,
              },
            });
          }

          const created = primitive.value
            ? {
                id: primitive.value.id,
                device1: primitive.value.device1,
                port1: primitive.value.port1,
                device2: primitive.value.device2,
                port2: primitive.value.port2,
                cableType: primitive.value.cableType,
                state: primitive.value.state,
              }
            : null;

          if (!verifyEnabled) {
            return createSuccessResult<LinkAddResult>("link.add", {
              requested,
              created,
            }, {
              advice: [
                `Ejecuta bun run pt link verify ${formatEndpoint(requested.device1, requested.port1)} ${formatEndpoint(requested.device2, requested.port2)} para verificar.`,
              ],
            });
          }

          await logPhase("verify", requested);

          let verification = await verifyLink(
            controller,
            requested.device1,
            created?.port1 ?? requested.port1,
            requested.device2,
            created?.port2 ?? requested.port2,
          );

          if (waitGreenMs > 0 && !verification.linkUp) {
            verification = await waitForGreen(controller, {
              device1: requested.device1,
              port1: created?.port1 ?? requested.port1,
              device2: requested.device2,
              port2: created?.port2 ?? requested.port2,
            }, waitGreenMs);
          }

          const checks = buildLinkVerificationChecks(verification);
          const verified = checks.every((check) => check.ok);

          return createVerifiedResult<LinkAddResult>("link.add", {
            requested,
            created,
            verification,
          }, {
            verified,
            checks,
          });
        },
      });

      renderCommandResult({
        result,
        flags,
        nextSteps: [
          `bun run pt link verify ${formatEndpoint(requested.device1, requested.port1)} ${formatEndpoint(requested.device2, requested.port2)}`,
          "bun run pt link list --json",
        ],
      });
    });
}
