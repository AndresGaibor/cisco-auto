import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import { runCommand } from "../../../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../../../contracts/cli-result.js";
import { getGlobalFlags } from "../../../flags.js";
import { type VerifyResult, printVerifyResult } from "../helpers.js";

export function registerSwitchingCommands(verify: Command): void {
  verify
    .command("stp")
    .description("Valida estado de Spanning Tree")
    .argument("<switch>", "Switch a verificar")
    .argument("[vlan]", "VLAN específica", "1")
    .action(async (switchName: string, vlan: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.stp",
        meta: {
          id: "verify.stp",
          summary: "Validar STP",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "stp"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { switchName, vlan },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `verify-stp-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(switchName, `show spanning-tree vlan ${vlan}`, {
            timeoutMs: flags.timeout ?? 30000,
            mode: "safe",
          });

          const ok = result.ok && !result.output.toLowerCase().includes("spanning tree instance(s) for vlan " + vlan + " does not exist");
          const isRoot = result.output.toLowerCase().includes("this bridge is the root");

          const verifyResult: VerifyResult = {
            check: "stp",
            ok,
            source: switchName,
            target: vlan,
            evidence: [result.output],
            probableCause: ok 
              ? undefined 
              : `STP no está activo para la VLAN ${vlan} o hay un error de configuración.`,
            nextSteps: ok
              ? [isRoot ? "Dispositivo es Root Bridge." : "Verifica el Root Bridge en otros switches."]
              : [`pt cmd ${switchName} "show spanning-tree summary"`],
          };

          if (!ok) {
            return createErrorResult("verify.stp", {
              code: "VERIFY_STP_FAILED",
              message: `STP no validado en ${switchName} para VLAN ${vlan}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.stp", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  verify
    .command("etherchannel")
    .description("Valida estado de EtherChannel (Port-Channel)")
    .argument("<switch>", "Switch a verificar")
    .action(async (switchName: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.etherchannel",
        meta: {
          id: "verify.etherchannel",
          summary: "Validar EtherChannel",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "etherchannel"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { switchName },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `verify-ec-${randomUUID().slice(0, 8)}`,
          });

          const summary = await service.executeCommand(switchName, "show etherchannel summary", {
            timeoutMs: flags.timeout ?? 30000,
            mode: "safe",
          });

          // Un Port-Channel está OK si tiene flag 'U' (in use) y está en capa 2 (S) o capa 3 (R)
          const ok = summary.ok && 
                     summary.output.includes("Po") && 
                     (summary.output.includes("(SU)") || summary.output.includes("(RU)") || summary.output.includes("(U)"));

          const verifyResult: VerifyResult = {
            check: "etherchannel",
            ok,
            source: switchName,
            evidence: [summary.output],
            probableCause: ok 
              ? undefined 
              : "No hay Port-Channels activos (estado U). Revisa modo de canal (LACP/PAgP) y compatibilidad de interfaces.",
            nextSteps: ok
              ? [`pt cmd ${switchName} "show interfaces trunk"`]
              : [
                  `pt cmd ${switchName} "show etherchannel summary"`,
                  `pt cmd ${switchName} "show run interface <INT>"`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.etherchannel", {
              code: "VERIFY_ETHERCHANNEL_FAILED",
              message: `EtherChannel no validado en ${switchName}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.etherchannel", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });
}
