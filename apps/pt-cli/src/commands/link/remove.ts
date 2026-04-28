#!/usr/bin/env bun

import { Command } from "commander";

import type { CliResult } from "../../contracts/cli-result.js";
import { createErrorResult, createSuccessResult, createVerifiedResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import { runCommand } from "../../application/run-command.js";
import { renderCommandResult } from "../../application/render-command-result.js";
import { verifyLink } from "../../application/verify-link.js";
import { flagsFromCommand, flagEnabled } from "../../flags-utils.js";
import { parseLinkEndpointArgs } from "../../utils/link-endpoint-parser.js";

interface LinkRemoveResult {
  requested: {
    device: string;
    port: string;
    device2?: string;
    port2?: string;
  };
  removed: unknown;
  verification?: unknown;
  verifiedAbsent?: boolean;
}

export const LINK_REMOVE_META: CommandMeta = {
  id: "link.remove",
  summary: "Eliminar un enlace live de Packet Tracer",
  longDescription:
    "Elimina un enlace live usando un endpoint o dos endpoints exactos. Usa --no-verify para un fast-path de un solo round-trip.",
  examples: [
    {
      command: "bun run pt link remove PC1:FastEthernet0 --force --no-verify",
      description: "Eliminar cualquier enlace conectado al puerto",
    },
    {
      command: "bun run pt link remove PC1:FastEthernet0 SW1:Fa0/1 --force --verify",
      description: "Eliminar enlace exacto y verificar ausencia",
    },
  ],
  related: [
    "bun run pt link list",
    "bun run pt link add",
    "bun run pt link verify",
  ],
  nextSteps: [
    "bun run pt link list --json",
  ],
  tags: ["link", "remove", "cable"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
};

function formatEndpoint(device: string, port: string): string {
  return `${device}:${port}`;
}

function isMissingLinkError(error: unknown): boolean {
  const text =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");

  return /not found|no existe|missing|does not exist/i.test(text);
}

export function createLinkRemoveCommand(): Command {
  return new Command("remove")
    .description("Eliminar un enlace live")
    .argument("[endpointOrDevice1]", "R1:Gi0/0 o R1")
    .argument("[endpointOrPort1]", "S1:Fa0/1 o Gi0/0")
    .argument("[device2]", "S1 si usas formato de 4 argumentos")
    .argument("[port2]", "Fa0/1 si usas formato de 4 argumentos")
    .option("-f, --force", "Eliminar sin confirmar", false)
    .option("--if-exists", "No fallar si el enlace no existe", false)
    .option("--verify", "Verificar que el enlace ya no existe")
    .option("--no-verify", "No verificar después de eliminar")
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
        console.log(JSON.stringify(LINK_REMOVE_META.examples, null, 2));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(LINK_REMOVE_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(LINK_REMOVE_META.longDescription ?? LINK_REMOVE_META.summary);
        return;
      }

      const endpoints = parseLinkEndpointArgs([arg1, arg2, arg3, arg4].filter(Boolean));

      if (!endpoints.a.device || !endpoints.a.port) {
        const result = createErrorResult<LinkRemoveResult>("link.remove", {
          code: "MISSING_ENDPOINT",
          message: "Debes indicar al menos el endpoint a eliminar.",
          details: {
            received: [arg1, arg2, arg3, arg4].filter(Boolean),
            examples: [
              "pt link remove R1:Gi0/0 --force",
              "pt link remove R1:Gi0/0 S1:Fa0/1 --force",
            ],
          },
        });

        renderCommandResult({ result, flags });
        return;
      }

      const requested = {
        device: endpoints.a.device,
        port: endpoints.a.port,
        ...(endpoints.b.device && endpoints.b.port
          ? {
              device2: endpoints.b.device,
              port2: endpoints.b.port,
            }
          : {}),
      };

      if (globalPlan) {
        const result = createSuccessResult<LinkRemoveResult>("link.remove", {
          requested,
          removed: null,
        }, {
          advice: [
            endpoints.b.device && endpoints.b.port
              ? `Eliminaría enlace exacto ${formatEndpoint(endpoints.a.device, endpoints.a.port)} ↔ ${formatEndpoint(endpoints.b.device, endpoints.b.port)}.`
              : `Eliminaría cualquier enlace en ${formatEndpoint(endpoints.a.device, endpoints.a.port)}.`,
            verifyEnabled ? "Después verificaría ausencia." : "No verificaría después porque usaste --no-verify.",
          ],
        });

        renderCommandResult({ result, flags });
        return;
      }

      const result = await runCommand<LinkRemoveResult>({
        action: "link.remove",
        meta: LINK_REMOVE_META,
        flags,
        payloadPreview: {
          ...requested,
          verify: verifyEnabled,
          ifExists: Boolean(options.ifExists),
        },
        execute: async (ctx): Promise<CliResult<LinkRemoveResult>> => {
          const { controller, logPhase } = ctx;

          await logPhase("apply", requested);

          const primitive = await controller.getBridge().sendCommandAndWait<{
            removed?: unknown;
          }>("link.remove", {
            type: "removeLink",
            device: endpoints.a.device,
            port: endpoints.a.port,
            ...(endpoints.b.device && endpoints.b.port
              ? {
                  device2: endpoints.b.device,
                  port2: endpoints.b.port,
                }
              : {}),
          });

          if (!primitive.ok) {
            if (options.ifExists && isMissingLinkError(primitive.error)) {
              return createSuccessResult<LinkRemoveResult>("link.remove", {
                requested,
                removed: null,
                verifiedAbsent: true,
              }, {
                advice: ["No se eliminó nada porque el enlace no existía."],
              });
            }

            return createErrorResult<LinkRemoveResult>("link.remove", {
              code: "LINK_REMOVE_FAILED",
              message: isMissingLinkError(primitive.error)
                ? "No existe un enlace para eliminar en el endpoint indicado."
                : String(primitive.error ?? "No se pudo eliminar el enlace."),
              details: {
                requested,
                bridgeResult: primitive,
              },
            });
          }

          const removed = primitive.value?.removed ?? null;

          if (!verifyEnabled) {
            return createSuccessResult<LinkRemoveResult>("link.remove", {
              requested,
              removed,
              verifiedAbsent: undefined,
            }, {
              advice: [
                "Ejecuta bun run pt link list --json para verificar.",
              ],
            });
          }

          await logPhase("verify", requested);

          if (endpoints.b.device && endpoints.b.port) {
            const verification = await verifyLink(
              controller,
              endpoints.a.device,
              endpoints.a.port,
              endpoints.b.device,
              endpoints.b.port,
            );

            const verifiedAbsent = !verification.linkVisible && !verification.linkUp;

            return createVerifiedResult<LinkRemoveResult>("link.remove", {
              requested,
              removed,
              verification,
              verifiedAbsent,
            }, {
              verified: verifiedAbsent,
              checks: [
                {
                  name: "link.absent",
                  ok: verifiedAbsent,
                  details: verification as unknown as Record<string, unknown>,
                },
              ],
            });
          }

          const device = await controller.inspectDevice(endpoints.a.device);
          const port = device?.ports?.find((candidate) => candidate.name.toLowerCase() === endpoints.a.port.toLowerCase());
          const verifiedAbsent = !port?.link;
          const verification = {
            device: endpoints.a.device,
            port: endpoints.a.port,
            exists: Boolean(port),
            linkPresent: Boolean(port?.link),
            link: port?.link ?? null,
          };

          return createVerifiedResult<LinkRemoveResult>("link.remove", {
            requested,
            removed,
            verification,
            verifiedAbsent,
          }, {
            verified: verifiedAbsent,
            checks: [
              {
                name: "link.absent",
                ok: verifiedAbsent,
                details: verification,
              },
            ],
          });
        },
      });

      renderCommandResult({
        result,
        flags,
        nextSteps: [
          "bun run pt link list --json",
        ],
      });
    });
}
