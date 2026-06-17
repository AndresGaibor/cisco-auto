import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import { runCommand } from "../../../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../../../contracts/cli-result.js";
import { getGlobalFlags } from "../../../flags.js";
import { type VerifyResult, printVerifyResult } from "../helpers.js";

export function registerRoutingCommands(verify: Command): void {
  verify
    .command("ospf")
    .description("Valida estado de OSPF: adyacencias y proceso")
    .argument("<device>", "Router a verificar")
    .action(async (device: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.ospf",
        meta: {
          id: "verify.ospf",
          summary: "Validar OSPF",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "ospf"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { device },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `verify-ospf-${randomUUID().slice(0, 8)}`,
          });

          const neighbors = await service.executeCommand(device, "show ip ospf neighbor", {
            timeoutMs: flags.timeout ?? 30000,
            mode: "safe",
          });

          const protocols = await service.executeCommand(device, "show ip protocols", {
            timeoutMs: flags.timeout ?? 30000,
            mode: "safe",
          });

          const hasNeighbors = neighbors.ok && neighbors.output.toLowerCase().includes("full/");
          const hasOspfProtocol = protocols.ok && protocols.output.toLowerCase().includes("ospf");

          const ok = hasNeighbors && hasOspfProtocol;

          const verifyResult: VerifyResult = {
            check: "ospf",
            ok,
            source: device,
            evidence: [neighbors.output, protocols.output],
            probableCause: ok 
              ? undefined 
              : !hasOspfProtocol 
                ? "OSPF no está configurado o el proceso no está corriendo." 
                : "No hay adyacencias OSPF en estado FULL. Revisa red, áreas y autenticación.",
            nextSteps: ok
              ? [`pt cmd ${device} "show ip route ospf"`]
              : [
                  `pt cmd ${device} "show ip protocols"`,
                  `pt cmd ${device} "show ip ospf neighbor"`,
                  `pt cmd ${device} "show ip ospf interface brief"`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.ospf", {
              code: "VERIFY_OSPF_FAILED",
              message: `OSPF no validado en ${device}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.ospf", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  verify
    .command("routing")
    .description("Valida tabla de rutas y aprendizaje de redes")
    .argument("<device>", "Router a verificar")
    .argument("[network]", "Red específica a buscar")
    .action(async (device: string, network: string | undefined, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.routing",
        meta: {
          id: "verify.routing",
          summary: "Validar Routing",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "routing"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { device, network },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `verify-routing-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(device, "show ip route", {
            timeoutMs: flags.timeout ?? 30000,
            mode: "safe",
          });

          let ok = result.ok;
          if (ok && network) {
            ok = result.output.includes(network);
          }

          const verifyResult: VerifyResult = {
            check: "routing",
            ok,
            source: device,
            target: network,
            evidence: [result.output],
            probableCause: ok 
              ? undefined 
              : network 
                ? `La red ${network} no está en la tabla de rutas.` 
                : "Error al leer la tabla de rutas.",
            nextSteps: ok
              ? [`pt verify ping ${device} <destino_en_red>`]
              : [
                  `pt cmd ${device} "show ip interface brief"`,
                  `pt cmd ${device} "show ip protocols"`,
                  `pt cmd ${device} "show running-config | include router"`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.routing", {
              code: "VERIFY_ROUTING_FAILED",
              message: `Routing no validado en ${device}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.routing", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  verify
    .command("cdp")
    .description("Valida descubrimiento de vecinos vía CDP")
    .argument("<device>", "Dispositivo a verificar")
    .action(async (device: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.cdp",
        meta: {
          id: "verify.cdp",
          summary: "Validar CDP",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "cdp"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { device },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `verify-cdp-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(device, "show cdp neighbors", {
            timeoutMs: flags.timeout ?? 20000,
            mode: "safe",
          });

          const ok = result.ok && 
                     (result.output.toLowerCase().includes("device id") || result.output.toLowerCase().includes("capability"));

          const verifyResult: VerifyResult = {
            check: "cdp",
            ok,
            source: device,
            evidence: [result.output],
            probableCause: ok 
              ? undefined 
              : "CDP no está mostrando vecinos. Revisa si 'cdp run' está activo o si hay enlaces físicos down.",
            nextSteps: ok
              ? [`pt cmd ${device} "show cdp neighbors detail"`]
              : [
                  `pt cmd ${device} --config "cdp run"`,
                  `pt inspect topology`,
                  `pt link list`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.cdp", {
              code: "VERIFY_CDP_FAILED",
              message: `CDP no detectó vecinos en ${device}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.cdp", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });
}
