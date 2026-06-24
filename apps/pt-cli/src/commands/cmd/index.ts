#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { Command } from "commander";
import { input, select } from "../../utils/inquirer.js";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import type { PTController } from "@cisco-auto/pt-control/controller";
import { isReadOnlyExecCommand } from "@cisco-auto/pt-control/services";
import type { TerminalCommandResult } from "@cisco-auto/terminal-contracts";
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
import {
  buildConfigCommand,
  looksLikeMultiCommandInput,
  needsConfigMode,
  normalizeCommandLines,
  readCommandsFromOptions,
} from "./input.js";

const DEFAULT_CMD_TIMEOUT_MS = 12_000;

function createRuntimeTerminalForCli(controller: any) {
  return {
    runTerminalPlan: controller.runTerminalPlan.bind(controller),
    ensureSession: controller.ensureTerminalSession.bind(controller),
    pollTerminalJob: async () => null,
  };
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

interface ExecuteCmdWorkflowOptions {
  deviceArg: string | undefined;
  commandParts: string[];
  options: {
    file?: string;
    stdin?: boolean;
    config?: boolean;
    save?: boolean;
    mode?: "safe" | "interactive" | "raw" | "strict" | "prompt";
    allowConfirm?: boolean;
    allowDestructive?: boolean;
    logs?: boolean;
    history?: boolean;
    complete?: boolean;
  };
  command: Command;
  modeOverride?: "safe" | "interactive" | "raw" | "strict";
  readOnly?: boolean;
}

function isMissingReadOnlyInput(
  deviceArg: string | undefined,
  options: { file?: string; stdin?: boolean },
): boolean {
  return Boolean(!deviceArg) && !options.file && !options.stdin;
}

function isLikelyMisorderedReadCommand(
  deviceArg: string | undefined,
  commandParts: string[],
  options: { file?: string; stdin?: boolean },
): boolean {
  return Boolean(deviceArg && commandParts.length === 1 && commandParts[0]?.trim().toLowerCase() === "read") && !options.file && !options.stdin;
}

async function executeCmdWorkflow({
  deviceArg,
  commandParts,
  options,
  command,
  modeOverride,
  readOnly,
}: ExecuteCmdWorkflowOptions): Promise<void> {
  const flags = getGlobalFlags(command);

  if (options.config) {
    process.stderr.write(
      "\x1b[33m[DEPRECATED]\x1b[0m --config está deprecado. " +
      "El CLI detecta automáticamente comandos de configuración. " +
      "Ejecuta sin --config: pt cmd R1 \"interface g0/0\" \"no shutdown\"\n",
    );
  }

  if (options.history) {
    process.stderr.write("El historial se moverá a: pt cmd history <device>. Usa ese subcomando en la Fase 5.3.\n");
  }

  if (readOnly && isMissingReadOnlyInput(deviceArg, options)) {
    const result = createErrorResult<CmdCliResult>("cmd.exec", {
      code: "CMD_READ_USAGE",
      message: "pt cmd read requiere dispositivo. Ejemplo: pt cmd read R1 (sin comando muestra estado) o pt cmd read R1 \"show running-config\"",
      details: {
        examples: [
          'pt cmd read R1 "show running-config"',
          'pt cmd read SW1 "show ip interface brief"',
          'pt cmd read R1 --file comandos.txt',
          "pt cmd read R1  (sin comando — muestra prompt actual del dispositivo)",
        ],
      },
    });
    process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

  if (isLikelyMisorderedReadCommand(deviceArg, commandParts, options)) {
    const result = createErrorResult<CmdCliResult>("cmd.exec", {
      code: "CMD_READ_MISORDERED",
      message: 'Si querías leer IOS usa: pt cmd read <device> "show running-config". "read" no es un comando IOS válido aquí.',
      details: {
        examples: [
          'pt cmd read R1 "show running-config"',
          'pt cmd read R1 "show ip interface brief"',
        ],
      },
    });
    process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 2;
    return;
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

  const commands = readCommandsFromOptions(
    {
      file: options.file,
      stdin: Boolean(options.stdin),
      config: Boolean(options.config),
    },
    commandParts,
  );

  const normalizedCommands = commands.length > 0 ? commands : [];
  const isReadWithoutCommand = Boolean(readOnly) && normalizedCommands.length === 0;

  if (normalizedCommands.length === 0 && !flags.noInput && !isReadWithoutCommand) {
    normalizedCommands.push(await promptForCommand());
  }

  if (normalizedCommands.length === 0 && !isReadWithoutCommand) {
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

  const requestedMode: "safe" | "interactive" | "raw" | "strict" =
    options.mode === "prompt"
      ? flags.noInput
        ? "safe"
        : await promptForMode()
      : (options.mode ?? "safe");
  const effectiveMode: "safe" | "interactive" | "raw" | "strict" = modeOverride ?? requestedMode;
  const detectedConfig = needsConfigMode(normalizedCommands);
  const finalCommand = options.config || detectedConfig
    ? buildConfigCommand(normalizedCommands, Boolean(options.save))
    : normalizedCommands.join("\n");

  if (readOnly && !isReadWithoutCommand && !normalizedCommands.every((line) => isReadOnlyExecCommand(line))) {
    const result = createErrorResult<CmdCliResult>("cmd.exec", {
      code: "CMD_READ_ONLY_REQUIRED",
      message: "pt cmd read solo acepta comandos IOS de solo lectura.",
      details: {
        received: finalCommand,
        supported: ["show", "ping", "traceroute", "dir", "more", "verify", "terminal"],
      },
    });
    process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

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
      summary: readOnly ? "Lee comandos IOS en modo read-only" : "Ejecuta comando universal en dispositivo",
      longDescription: readOnly
        ? "Lee información del dispositivo sin inyectar preámbulo de paginador."
        : "Detecta IOS/host y ejecuta comandos a través del backend correcto.",
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
      mode: effectiveMode,
      config: Boolean(options.config),
      save: Boolean(options.save),
      readOnly: Boolean(readOnly),
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
          mode: effectiveMode,
          allowConfirm: Boolean(options.allowConfirm),
          allowDestructive: Boolean(options.allowDestructive),
          evidenceLevel: flags.verbose ? "full" : "summary",
        });

      const readTerminalResult = isReadWithoutCommand
        ? (await ctx.controller.ensureTerminalSession(device!),
          (await ctx.controller.getBridge().sendCommandAndWait("readTerminal", { device })).value) as any
        : null;
      const result: TerminalCommandResult = isReadWithoutCommand
        ? {
            ok: readTerminalResult?.ok !== false,
            action: "ios.exec",
            device: device!,
            deviceKind: "router" as any,
            command: "(read terminal)",
            output: String(readTerminalResult?.output ?? ""),
            rawOutput: String(readTerminalResult?.output ?? ""),
            status: readTerminalResult?.ok !== false ? 0 : 1,
            warnings: [],
            evidence: {
              type: "readTerminal",
              mode: readTerminalResult?.mode ?? "",
              prompt: readTerminalResult?.prompt ?? "",
              output: readTerminalResult?.output ?? "",
            },
          }
        : Boolean(options.complete) && isCompleteShowInterfacesRequest(finalCommand)
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
}

export function createCmdCommand(): Command {
  const cmd = new Command("cmd")
    .description("Ejecuta comandos en routers, switches, PCs y servers. Acepta varios argumentos como líneas separadas cuando son comandos distintos.")
    .summary("Terminal universal para Packet Tracer")
    .argument("[device]", "Dispositivo destino: R1, SW1, PC1, Server1")
    .argument("[command...]", "Comando a ejecutar. Usa comillas para comandos con espacios.")
    .option("--config", "Tratar entrada como configuración IOS; envuelve en configure terminal/end (DEPRECADO: detección automática activa — se eliminará en futura versión)", false)
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
  pt cmd R1 "show ip interface brief ; show ip route"
  pt cmd read R1 "show running-config"

Encadenar comandos con ; :
  pt cmd R1 "show version ; show ip interface brief ; show ip route"
  pt cmd R1 "show running-config | section ospf ; show ip ospf neighbor"
  pt cmd SW1 "show vlan brief ; show interfaces trunk ; show spanning-tree summary"
  pt cmd R1 "interface g0/0 ; ip address 192.168.1.1 255.255.255.0 ; no shutdown"
  pt cmd SW1 "vlan 10 ; name DATA ; vlan 20 ; name VOICE"

  El ; separa comandos en un solo string y el backend los ejecuta secuencialmente
  en un mismo plan terminal. Reduce latencia vs. ejecutar comandos uno por uno.

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
      await executeCmdWorkflow({ deviceArg, commandParts, options, command });
    });

  cmd
    .command("read")
    .description("Lee comandos IOS en modo read-only sin preámbulo de paginador")
    .argument("[device]", "Dispositivo destino: R1, SW1, PC1, Server1")
    .argument("[command...]", "Comando IOS de solo lectura")
    .option("--file <path>", "Leer comandos desde archivo de texto plano")
    .option("--stdin", "Leer comandos desde stdin")
    .option("--logs", "Incluir syslogs IOS asíncronos en la salida limpia", false)
    .option("--history", "Mostrar historial del dispositivo si el runtime lo soporta", false)
    .option("--complete", "Para show interfaces, recolecta cada interfaz por separado y une el resultado completo", false)
    .action(async (deviceArg: string | undefined, commandParts: string[], options, command) => {
      await executeCmdWorkflow({ deviceArg, commandParts, options, command, readOnly: true });
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
      const commandText = commandParts.join(" ").trim();

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
  needsConfigMode,
  readCommandsFromOptions,
  buildConfigCommand,
  isMissingReadOnlyInput,
  isLikelyMisorderedReadCommand,
};
