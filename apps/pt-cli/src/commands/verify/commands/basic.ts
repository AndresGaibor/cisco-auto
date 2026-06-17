import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import { runCommand } from "../../../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../../../contracts/cli-result.js";
import { getGlobalFlags } from "../../../flags.js";
import { type VerifyResult, printVerifyResult } from "../helpers.js";

export function registerBasicCommands(verify: Command): void {
  verify
    .command("ping")
    .description("Valida ping desde un host o dispositivo")
    .argument("<source>", "Dispositivo origen")
    .argument("<target>", "IP o hostname destino")
    .action(async (source: string, target: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.ping",
        meta: {
          id: "verify.ping",
          summary: "Validar ping",
          examples: [],
          related: ["cmd", "set host"],
          tags: ["verify", "ping"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { source, target },
        execute: async (ctx) => {
          let resolvedTarget = target;
          
          // Resolución automática de nombre de dispositivo a IP
          if (!target.includes(".")) {
              const devices = await ctx.controller.listDevices();
              const found = devices.find(d => d.name.toLowerCase() === target.toLowerCase());
              if (found && found.ports && found.ports.length > 0) {
                  const portWithIp = found.ports.find((p: any) => p.ipAddress && p.ipAddress !== "0.0.0.0");
                  if (portWithIp) {
                      resolvedTarget = portWithIp.ipAddress.split("/")[0];
                  }
              }
          }

          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `verify-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(source, `ping ${resolvedTarget}`, {
            timeoutMs: flags.timeout ?? 60000,
            mode: "interactive",
            allowConfirm: true,
          });

          const output = result.output.toLowerCase();
          const ok =
            result.ok &&
            (
              output.includes("success rate is 100 percent") ||
              output.includes("success rate is 80 percent") ||
              output.includes("reply from") ||
              output.includes("ttl=")
            ) &&
            !output.includes("request timed out") &&
            !output.includes("destination host unreachable");

          const verifyResult: VerifyResult = {
            check: "ping",
            ok,
            source,
            target,
            evidence: [result.output],
            probableCause: ok
              ? undefined
              : "Falla de conectividad. Revisa IP, máscara, gateway, VLAN, trunk, routing o estado de interfaces.",
            nextSteps: ok
              ? [`pt cmd ${source} "ipconfig"`]
              : [
                  `pt cmd ${source} "ipconfig"`,
                  `pt device list`,
                  `pt link verify`,
                  `pt cmd <router> "show ip interface brief"`,
                  `pt cmd <switch> "show vlan brief"`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.ping", {
              code: "VERIFY_PING_FAILED",
              message: `No hay conectividad validada desde ${source} hacia ${target}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.ping", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  verify
    .command("vlan")
    .description("Valida que una VLAN exista en un switch")
    .argument("<switch>", "Switch")
    .argument("<vlan>", "VLAN ID")
    .action(async (switchName: string, vlan: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.vlan",
        meta: {
          id: "verify.vlan",
          summary: "Validar VLAN",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "vlan"],
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
            generateId: () => `verify-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(switchName, "show vlan brief", {
            timeoutMs: flags.timeout ?? 45000,
            mode: "safe",
          });

          const ok = result.ok && new RegExp(`(^|\\n)\\s*${vlan}\\s+`, "m").test(result.output);

          const verifyResult: VerifyResult = {
            check: "vlan",
            ok,
            source: switchName,
            target: vlan,
            evidence: [result.output],
            probableCause: ok ? undefined : `La VLAN ${vlan} no aparece en show vlan brief.`,
            nextSteps: ok
              ? [`pt cmd ${switchName} "show vlan brief"`]
              : [
                  `pt cmd ${switchName} --config "vlan ${vlan}" "name VLAN${vlan}"`,
                  `pt cmd ${switchName} "show vlan brief"`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.vlan", {
              code: "VERIFY_VLAN_FAILED",
              message: `VLAN ${vlan} no validada en ${switchName}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.vlan", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });
}
