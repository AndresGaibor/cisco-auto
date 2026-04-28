#!/usr/bin/env bun

import { Command } from "commander";

import type { CliResult } from "../../contracts/cli-result.js";
import { createErrorResult, createVerifiedResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import { runCommand } from "../../application/run-command.js";
import { renderCommandResult } from "../../application/render-command-result.js";
import { flagsFromCommand } from "../../flags-utils.js";
import { parseLinkEndpointArgs } from "../../utils/link-endpoint-parser.js";

interface RuntimeVerifyLinkValue {
  ok?: boolean;
  connected?: boolean;
  exact?: boolean;
  verified?: boolean;
  state?: string;
  device1?: string;
  port1?: string;
  device2?: string;
  port2?: string;
  endpointA?: {
    device?: string;
    port?: string;
    exists?: boolean;
  };
  endpointB?: {
    device?: string;
    port?: string;
    exists?: boolean;
  };
  linkVisible?: boolean;
  linkUp?: boolean;
  advice?: string[];
  code?: string;
  error?: string;
  [key: string]: unknown;
}

interface LinkVerifyFastData {
  endpointA: {
    device: string;
    port: string;
    exists: boolean;
  };
  endpointB: {
    device: string;
    port: string;
    exists: boolean;
  };
  linkVisible: boolean;
  linkUp: boolean;
  connected: boolean;
  exact: boolean;
  state: string;
  runtime: RuntimeVerifyLinkValue | null;
}

interface VerifyLinkEnvelope {
  ok?: boolean;
  value?: RuntimeVerifyLinkValue;
  error?: {
    code?: string;
    message?: string;
    phase?: string;
  };
}

function unwrapRuntimeVerifyValue(value: unknown): RuntimeVerifyLinkValue | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  if ("value" in record && record.value && typeof record.value === "object") {
    return record.value as RuntimeVerifyLinkValue;
  }

  return record as RuntimeVerifyLinkValue;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRuntimeVerification(
  value: RuntimeVerifyLinkValue | null | undefined,
  requested: {
    device1: string;
    port1: string;
    device2: string;
    port2: string;
  },
): LinkVerifyFastData {
  const runtime = unwrapRuntimeVerifyValue(value);

  const connected = Boolean(runtime?.connected ?? runtime?.exact ?? runtime?.linkVisible);
  const exact = Boolean(runtime?.exact ?? runtime?.connected);
  const state = String(runtime?.state ?? (connected ? "unknown" : "missing"));
  const linkUp = Boolean(runtime?.linkUp ?? runtime?.operational ?? runtime?.verified ?? state === "green");

  const endpointAExists =
    typeof runtime?.endpointA?.exists === "boolean"
      ? runtime.endpointA.exists
      : !String(runtime?.code ?? "").includes("DEVICE_NOT_FOUND") &&
        !String(runtime?.error ?? "").includes(requested.device1);

  const endpointBExists =
    typeof runtime?.endpointB?.exists === "boolean"
      ? runtime.endpointB.exists
      : !String(runtime?.code ?? "").includes("DEVICE_NOT_FOUND") &&
        !String(runtime?.error ?? "").includes(requested.device2);

  return {
    endpointA: {
      device: runtime?.endpointA?.device ?? runtime?.device1 ?? requested.device1,
      port: runtime?.endpointA?.port ?? runtime?.port1 ?? requested.port1,
      exists: endpointAExists,
    },
    endpointB: {
      device: runtime?.endpointB?.device ?? runtime?.device2 ?? requested.device2,
      port: runtime?.endpointB?.port ?? runtime?.port2 ?? requested.port2,
      exists: endpointBExists,
    },
    linkVisible: connected,
    linkUp,
    connected,
    exact,
    state,
    runtime,
  };
}

function buildFastChecks(data: LinkVerifyFastData) {
  return [
    {
      name: "endpoint-a-exists",
      ok: data.endpointA.exists,
      details: data.endpointA,
    },
    {
      name: "endpoint-b-exists",
      ok: data.endpointB.exists,
      details: data.endpointB,
    },
    {
      name: "link-visible",
      ok: data.linkVisible,
      details: {
        connected: data.connected,
        exact: data.exact,
        state: data.state,
      },
    },
    {
      name: "link-up",
      ok: data.linkUp,
      details: {
        state: data.state,
      },
    },
  ];
}

async function verifyLinkFast(
  controller: {
    getBridge(): {
      sendCommandAndWait<TPayload = unknown, TResult = unknown>(
        type: string,
        payload: TPayload,
        timeoutMs?: number,
      ): Promise<any>;
    };
  },
  requested: {
    device1: string;
    port1: string;
    device2: string;
    port2: string;
  },
): Promise<LinkVerifyFastData> {
  const payload = {
    type: "verifyLink" as const,
    ...requested,
  };

  const envelope = (await controller
    .getBridge()
    .sendCommandAndWait<typeof payload, VerifyLinkEnvelope>("verifyLink", payload, 5_000)) as VerifyLinkEnvelope;

  const value =
    envelope?.value ??
    (envelope?.ok === false
      ? {
          ok: false,
          code: envelope.error?.code,
          error: envelope.error?.message,
          state: "missing",
          connected: false,
          exact: false,
          verified: false,
        }
      : null);

  return normalizeRuntimeVerification(unwrapRuntimeVerifyValue(value), requested);
}

async function waitForGreenFast(
  controller: Parameters<typeof verifyLinkFast>[0],
  requested: {
    device1: string;
    port1: string;
    device2: string;
    port2: string;
  },
  timeoutMs: number,
): Promise<LinkVerifyFastData> {
  const startedAt = Date.now();
  let last = await verifyLinkFast(controller, requested);

  while (Date.now() - startedAt < timeoutMs) {
    if (last.linkUp || last.state === "green") return last;
    await sleep(500);
    last = await verifyLinkFast(controller, requested);
  }

  return last;
}

export const LINK_VERIFY_META: CommandMeta = {
  id: "link.verify",
  summary: "Verificar un enlace live entre dos puertos",
  longDescription:
    "Verifica si dos puertos siguen enlazados usando el handler rápido verifyLink. No usa snapshot ni inspect por defecto.",
  examples: [
    {
      command: "bun run pt link verify R1:Gi0/0 S1:Fa0/1 --json",
      description: "Verificar un enlace en JSON usando verifyLink rápido",
    },
    {
      command: "bun run pt link verify PC1:FastEthernet0 PC2:FastEthernet0 --wait-green 30000 --json",
      description: "Esperar hasta que el enlace quede verde",
    },
  ],
  related: ["bun run pt link add", "bun run pt link remove", "bun run pt link doctor"],
  nextSteps: ["bun run pt link list --json"],
  tags: ["link", "verify", "diagnostic"],
  supportsJson: true,
};

export function createLinkVerifyCommand(): Command {
  return new Command("verify")
    .description("Verificar un enlace live entre dos puertos")
    .argument("[endpointOrDevice1]", "R1:Gi0/0 o R1")
    .argument("[endpointOrPort1]", "S1:Fa0/1 o Gi0/0")
    .argument("[device2]", "S1 si usas formato de 4 argumentos")
    .argument("[port2]", "Fa0/1 si usas formato de 4 argumentos")
    .option("--wait-green <ms>", "Esperar hasta que quede verde", "0")
    .option("--json", "Salida en JSON", false)
    .action(async (arg1, arg2, arg3, arg4, options, command) => {
      const flags = flagsFromCommand(command);
      const rawArgs = [arg1, arg2, arg3, arg4].filter((value): value is string => Boolean(value));
      const endpoints = parseLinkEndpointArgs(rawArgs);

      const requested = {
        device1: endpoints.a.device,
        port1: endpoints.a.port,
        device2: endpoints.b.device,
        port2: endpoints.b.port,
      };

      const result = await runCommand<LinkVerifyFastData>({
        action: "link.verify",
        meta: LINK_VERIFY_META,
        flags,
        payloadPreview: {
          ...requested,
          waitGreenMs: Number(options.waitGreen ?? 0),
          mode: "fast",
          handler: "verifyLink",
        },
        execute: async ({ controller, logPhase }): Promise<CliResult<LinkVerifyFastData>> => {
          if (!requested.device1 || !requested.port1 || !requested.device2 || !requested.port2) {
            return createErrorResult<LinkVerifyFastData>("link.verify", {
              code: "MISSING_ENDPOINT",
              message: "Debes indicar ambos extremos del enlace.",
              details: {
                received: rawArgs,
                examples: [
                  "pt link verify R1:Gi0/0 S1:Fa0/1",
                  "pt link verify R1 Gi0/0 S1 Fa0/1",
                ],
              },
            });
          }

          await logPhase("verify", requested);

          const waitGreenMs = Number(options.waitGreen ?? 0);

          const verification =
            waitGreenMs > 0
              ? await waitForGreenFast(controller, requested, waitGreenMs)
              : await verifyLinkFast(controller, requested);

          const checks = buildFastChecks(verification);
          const verified = checks.every((check) => check.ok);

          return createVerifiedResult<LinkVerifyFastData>("link.verify", verification, {
            verified,
            checks,
          });
        },
      });

      renderCommandResult({ result, flags });
    });
}
