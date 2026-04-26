#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { Command } from "commander";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import { runCommand } from "../../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../../contracts/cli-result.js";
import { getGlobalFlags } from "../../flags.js";

interface VerifyResult {
  check: string;
  ok: boolean;
  source?: string;
  target?: string;
  evidence: string[];
  probableCause?: string;
  nextSteps: string[];
}

function printVerifyResult(result: unknown, flags: { json: boolean }): void {
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export function createVerifyCommand(): Command {
  const verify = new Command("verify")
    .description("Valida conectividad, VLANs, routing, servicios y protocolos")
    .addHelpText(
      "after",
      `
Ejemplos:
  pt verify ping PC1 192.168.10.1
  pt verify vlan SW1 10
  pt verify dhcp PC1
  pt verify dns PC1 empresa.local
  pt verify all

Regla para agentes:
  - Ejecuta verify después de cmd/set/device/link.
  - Si verify falla, lee probableCause y nextSteps.
`,
    );

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
          json: flags.json,
          jq: null,
          output: "text",
          verbose: flags.verbose,
          quiet: flags.quiet,
          trace: flags.trace,
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
          timeout: flags.timeout ?? undefined,
          noTimeout: false,
          table: false,
          raw: false,
          yes: false,
          noInput: flags.noInput,
          noColor: false,
        },
        payloadPreview: { source, target },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller,
            runtimeTerminal: null,
            generateId: () => `verify-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(source, `ping ${target}`, {
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
          json: flags.json,
          jq: null,
          output: "text",
          verbose: flags.verbose,
          quiet: flags.quiet,
          trace: flags.trace,
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
          timeout: flags.timeout ?? undefined,
          noTimeout: false,
          table: false,
          raw: false,
          yes: false,
          noInput: flags.noInput,
          noColor: false,
        },
        payloadPreview: { switchName, vlan },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller,
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

  verify
    .command("all")
    .description("Ejecuta validaciones generales del laboratorio")
    .action((_options, command) => {
      const flags = getGlobalFlags(command);
      const result = {
        ok: false,
        message: "verify all debe implementarse agregando checks disponibles: link verify, device list, ping matrix opcional, vlan/routing/services detectados.",
        nextSteps: [
          "pt link verify",
          "pt device list --json",
          "pt verify ping <source> <target>",
        ],
      };
      printVerifyResult(result, flags);
      process.exitCode = 1;
    });

  return verify;
}