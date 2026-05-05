#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Command } from "commander";
import { input, select } from "../../utils/inquirer.js";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import type { PTController } from "@cisco-auto/pt-control/controller";
import { runCommand } from "../../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../../contracts/cli-result.js";
import { getGlobalFlags } from "../../flags.js";
import {
  mergeCmdEvidenceTimings,
  printCmdResult,
  toCmdCliResult,
  type CmdCliResult,
} from "./render.js";
import {
  executeCompleteShowInterfaces,
  isCompleteShowInterfacesRequest,
} from "./interfaces-complete.js";

const DEFAULT_CMD_TIMEOUT_MS = 12_000;

function createRuntimeTerminalForCli(controller: any) {
  return {
    runTerminalPlan: controller.runTerminalPlan.bind(controller),
    ensureSession: controller.ensureTerminalSession.bind(controller),
    pollTerminalJob: async () => null,
  };
}

function joinCommandParts(parts: string[]): string {
  return parts.join(" ").trim();
}

function normalizeCommandLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.trimStart().startsWith("#"));
}

function looksLikeMultiCommandInput(commandParts: string[]): boolean {
  const parts = commandParts
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return false;

  if (parts.some((part) => /\r?\n/.test(part))) {
    return true;
  }

  const lower = parts.map((part) => part.toLowerCase());

  const startsConfigContext = /^(interface|vlan|router|line|ip access-list|class-map|policy-map|ip dhcp pool)\b/.test(lower[0] ?? "");

  const hasConfigChild = lower.slice(1).some((part) =>
    /^(description|switchport|shutdown|no shutdown|ip address|ipv6 address|duplex|speed|name|network|default-router|dns-server|lease|login|password|transport input|exec-timeout|channel-group|spanning-tree)\b/.test(part),
  );

  if (startsConfigContext && hasConfigChild) {
    return true;
  }

  const everyPartLooksLikeFullCommand = parts.every((part) => /\s+/.test(part));

  if (everyPartLooksLikeFullCommand) {
    return true;
  }

  return false;
}

function readCommandsFromOptions(
  options: { file?: string; stdin?: boolean; config?: boolean },
  commandParts: string[],
): string[] {
  if (options.file) {
    return normalizeCommandLines(readFileSync(options.file, "utf-8"));
  }

  if (options.stdin) {
    return normalizeCommandLines(readFileSync(0, "utf-8"));
  }

  if (options.config) {
    return commandParts.flatMap((part) => normalizeCommandLines(part)).filter(Boolean);
  }

  if (looksLikeMultiCommandInput(commandParts)) {
    return commandParts.flatMap((part) => normalizeCommandLines(part)).filter(Boolean);
  }

  const joined = joinCommandParts(commandParts);
  return joined ? normalizeCommandLines(joined) : [];
}

function isEndCommand(command: string): boolean {
  return /^(end|exit)$/i.test(command.trim());
}

function buildConfigCommand(commands: string[], save: boolean): string {
  const lines: string[] = [];
  const normalizedCommands = commands.filter((line) => line.trim().length > 0);

  lines.push("configure terminal");
  lines.push(...normalizedCommands);

  const lastCommand = normalizedCommands.at(-1);
  if (!lastCommand || !isEndCommand(lastCommand)) {
    lines.push("end");
  }

  if (save) lines.push("write memory");
  return lines.join("\n");
}

async function promptForCommand(): Promise<string> {
  return input({
    message: "Comando a ejecutar:",
        validate: (value: string) => value.trim().length > 0 || "El comando no puede estar vacío",
  });
}

async function promptForMode(): Promise<"safe" | "interactive" | "raw" | "strict"> {
  return select({
    message: "Modo de ejecución:",
    choices: [
      { name: "safe — lectura/config normal, sin aceptar confirmaciones destructivas", value: "safe" },
      { name: "interactive — permite confirmaciones y diálogos", value: "interactive" },
      { name: "raw — envía comando con mínima intervención", value: "raw" },
      { name: "strict — falla ante ambigüedad o salida sospechosa", value: "strict" },
    ],
    default: "safe",
  });
}

export function createCmdCommand(): Command {
  const cmd = new Command("cmd")
    .description("Ejecuta comandos en routers, switches, PCs y servers. Acepta varios argumentos como líneas separadas cuando son comandos distintos.")
    .summary("Terminal universal para Packet Tracer")
    .argument("[device]", "Dispositivo destino: R1, SW1, PC1, Server1")
    .argument("[command...]", "Comando a ejecutar. Usa comillas para comandos con espacios.")
    .option("--config", "Tratar entrada como configuración IOS; envuelve en configure terminal/end (DEPRECADO: detección automática activa)", false)
    .option("--save", "Después de --config, ejecutar write memory", false)
    .option("--file <path>", "Leer comandos desde archivo de texto plano")
    .option("--stdin", "Leer comandos desde stdin")
    .option("--mode <mode>", "safe|interactive|raw|strict", "safe")
    .option("--allow-confirm", "Permitir confirmaciones interactivas", false)
    .option("--allow-destructive", "Permitir comandos destructivos", false)
    .option("--logs", "Incluir syslogs IOS asíncronos en la salida limpia", false)
    .option("--history", "Mostrar historial del dispositivo si el runtime lo soporta", false)
    .option("--repl", "Abrir modo interactivo guiado para el dispositivo", false)
    .option("--complete", "Para show interfaces, recolecta cada interfaz por separado y une el resultado completo", false)
    .addHelpText(
      "after",
      `
Ejemplos:
  pt cmd R1 "show ip interface brief"
  pt cmd SW1 "show vlan brief"
  pt cmd PC1 "ipconfig"
  pt cmd PC1 "ping 192.168.10.1"
  pt cmd SW1 "comando 1" "comando 2" "comando 3"
  pt cmd SW1 "show interfaces" --complete

Configuración automática (detectada por el CLI):
  pt cmd R1 "interface g0/0" "no shutdown"
  pt cmd R1 "hostname R1-CORE"
  pt cmd SW1 "vlan 10" "name DATA"

Nota:
  - Si pasas varios argumentos y parecen comandos IOS separados, el CLI los ejecuta como líneas independientes.
  - Si pasas un comando simple con espacios, puedes usar comillas o escribirlo sin comillas.
  - Usa --complete con "show interfaces" si Packet Tracer recorta la salida larga.

Legacy --config (envuelve en configure terminal/end):
  pt cmd R1 --config "interface g0/0" "no shutdown"
  pt cmd R1 --config --file configs/r1.txt
  cat configs/sw1.txt | pt cmd SW1 --config --stdin

Reglas:
  - Si puedes escribirlo en IOS o Command Prompt, usa pt cmd.
  - Para propiedades de GUI/API usa pt set.
  - Para validar el resultado usa pt verify.
`,
    )
    .action(async (deviceArg: string | undefined, commandParts: string[], options, command) => {
      const flags = getGlobalFlags(command);

      if (options.history) {
        process.stderr.write("El historial se moverá a: pt cmd history <device>. Usa ese subcomando en la Fase 5.3.\n");
      }

      let device = deviceArg;
      if (!device && !flags.noInput) {
        device = await input({
          message: "Dispositivo destino:",
          validate: (value: string) => value.trim().length > 0 || "Debes especificar un dispositivo",
        });
      }

      if (!device) {
        const result = createErrorResult<CmdCliResult>("cmd.exec", {
          code: "CMD_DEVICE_REQUIRED",
          message: "Debes especificar un dispositivo. Ejemplo: pt cmd R1 \"show version\"",
        });
        process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
        process.exitCode = 2;
        return;
      }

      let commands = readCommandsFromOptions(
        {
          file: options.file,
          stdin: Boolean(options.stdin),
          config: Boolean(options.config),
        },
        commandParts,
      );

      if (commands.length === 0 && !flags.noInput) {
        commands = [await promptForCommand()];
      }

      if (commands.length === 0) {
        const result = createErrorResult<CmdCliResult>("cmd.exec", {
          code: "CMD_COMMAND_REQUIRED",
          message: "Debes especificar un comando, --file o --stdin.",
          details: {
            examples: [
              'pt cmd R1 "show version"',
              'pt cmd PC1 "ipconfig"',
              "pt cmd R1 --config --file configs/r1.txt",
            ],
          },
        });
        process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
        process.exitCode = 2;
        return;
      }

      const mode = options.mode === "prompt" && !flags.noInput ? await promptForMode() : options.mode;
      const finalCommand = options.config ? buildConfigCommand(commands, Boolean(options.save)) : commands.join("\n");

      if (Boolean(options.complete) && !isCompleteShowInterfacesRequest(finalCommand)) {
        const result = createErrorResult<CmdCliResult>("cmd.exec", {
          code: "CMD_COMPLETE_UNSUPPORTED",
          message: '--complete solo está soportado para el comando exacto "show interfaces".',
          details: {
            received: finalCommand,
            supported: ['pt cmd <device> "show interfaces" --complete'],
          },
        });
        process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
        process.exitCode = 2;
        return;
      }

      const wrapped = await runCommand<CmdCliResult>({
        action: "cmd.exec",
        meta: {
          id: "cmd.exec",
          summary: "Ejecuta comando universal en dispositivo",
          longDescription: "Detecta IOS/host y ejecuta comandos a través del backend correcto.",
          examples: [],
          related: ["verify", "device list"],
          tags: ["cmd", "terminal"],
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
          lightweightContext: flags.lightweightContext,
        },
        payloadPreview: {
          device,
          command: finalCommand,
          mode,
          config: Boolean(options.config),
          save: Boolean(options.save),
        },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: createRuntimeTerminalForCli(ctx.controller),
            generateId: () => `cmd-${randomUUID().slice(0, 8)}`,
          });

          const executeCommand = (commandToRun: string, timeoutMs = flags.timeout ?? DEFAULT_CMD_TIMEOUT_MS) =>
            service.executeCommand(device!, commandToRun, {
              timeoutMs,
              mode,
              allowConfirm: Boolean(options.allowConfirm),
              allowDestructive: Boolean(options.allowDestructive),
              evidenceLevel: flags.verbose ? "full" : "summary",
            });

          const result =
            Boolean(options.complete) && isCompleteShowInterfacesRequest(finalCommand)
              ? await executeCompleteShowInterfaces({
                  device: device!,
                  execute: executeCommand,
                  timeoutMs: flags.timeout ?? DEFAULT_CMD_TIMEOUT_MS,
                })
              : await executeCommand(finalCommand);

          const cliResult = toCmdCliResult(result, {
            includeSyslogs: Boolean(options.logs),
          });

          if (!result.ok) {
            return createErrorResult("cmd.exec", {
              code: result.error?.code ?? "CMD_EXEC_FAILED",
              message: result.error?.message ?? "Error ejecutando comando",
              details: cliResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("cmd.exec", cliResult, {
            advice: cliResult.nextSteps,
            warnings: cliResult.warnings,
          });
        },
      });

      const errorDetails = wrapped.error?.details as Partial<CmdCliResult> | undefined;

      const data = wrapped.data ?? {
        schemaVersion: "1.0",
        ok: false,
        action: "cmd.exec",
        device,
        deviceKind: String(errorDetails?.deviceKind ?? "unknown"),
        command: finalCommand,
        output: String(errorDetails?.output ?? ""),
        rawOutput: String(errorDetails?.rawOutput ?? errorDetails?.output ?? ""),
        status: Number(errorDetails?.status ?? 1),
        warnings: [
          ...(Array.isArray(errorDetails?.warnings) ? errorDetails.warnings : []),
          ...(Array.isArray(wrapped.warnings) ? wrapped.warnings : []),
        ],
        error: {
          code: wrapped.error?.code ?? errorDetails?.error?.code ?? "CMD_EXEC_FAILED",
          message: wrapped.error?.message ?? errorDetails?.error?.message ?? "Error ejecutando comando",
          phase: errorDetails?.error?.phase,
        },
        nextSteps: errorDetails?.nextSteps ?? wrapped.advice ?? ["pt doctor"],
        evidence: errorDetails?.evidence,
        timings: errorDetails?.timings,
      } satisfies CmdCliResult;

      mergeCmdEvidenceTimings(data, wrapped.meta);

      printCmdResult(data, {
        json: flags.json,
        raw: flags.raw,
        quiet: flags.quiet,
      });

      if (!wrapped.ok) process.exitCode = 1;
    });

  cmd
    .command("each")
    .description("Ejecuta un comando en varios dispositivos")
    .requiredOption("--devices <list>", "Lista separada por coma: R1,R2,SW1")
    .argument("<command...>", "Comando a ejecutar")
    .option("--mode <mode>", "safe|interactive|raw|strict", "safe")
    .action(async (commandParts: string[], options, command) => {
      const flags = getGlobalFlags(command);
      const devices = String(options.devices)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const commandText = joinCommandParts(commandParts);

      const results: CmdCliResult[] = [];

      for (const device of devices) {
            const serviceResult = await runCommand<CmdCliResult>({
          action: "cmd.each",
          meta: {
            id: "cmd.each",
            summary: "Ejecuta comando en varios dispositivos",
            examples: [],
            related: ["cmd", "verify all"],
            tags: ["cmd"],
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
            quiet: true,
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
            noInput: true,
            noColor: false,
            lightweightContext: flags.lightweightContext,
          },
          payloadPreview: { device, commandText },
            execute: async (ctx) => {
              const service = createTerminalCommandService({
                controller: ctx.controller as any,
                runtimeTerminal: createRuntimeTerminalForCli(ctx.controller),
                generateId: () => `cmd-${randomUUID().slice(0, 8)}`,
              });

              const result = await service.executeCommand(device, commandText, {
                timeoutMs: flags.timeout ?? DEFAULT_CMD_TIMEOUT_MS,
                mode: options.mode,
              });

            const cliResult = toCmdCliResult(result, {
              includeSyslogs: Boolean(options.logs),
            });
            if (!result.ok) {
              return createErrorResult("cmd.each", {
                code: result.error?.code ?? "CMD_EXEC_FAILED",
                message: result.error?.message ?? "Error ejecutando comando",
                details: cliResult as unknown as Record<string, unknown>,
              });
            }

            return createSuccessResult("cmd.each", cliResult);
          },
        });

        if (serviceResult.data) results.push(serviceResult.data);
      }

      if (flags.json) {
        process.stdout.write(`${JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2)}\n`);
        return;
      }

      for (const result of results) {
        printCmdResult(result, { json: false, raw: flags.raw, quiet: false });
      }
    });

  return cmd;
}

export const __test__ = {
  normalizeCommandLines,
  looksLikeMultiCommandInput,
  readCommandsFromOptions,
  buildConfigCommand,
  isEndCommand,
};
