#!/usr/bin/env bun
import { Command } from "commander";
import type { OmniRisk } from "@cisco-auto/pt-control/ports";
import { OMNI_CAPABILITY_REGISTRY, getCapabilityDef } from "@cisco-auto/pt-control/adapters";
import { runCommand } from "../../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../../contracts/cli-result.js";
import { getGlobalFlags, type GlobalFlags } from "../../flags.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import { readOmniCode, tryParseJsonValue } from "./input.js";
import { evaluateOmniRawPolicy, hasRawApproval } from "./policy.js";
import { printOmniResult } from "./render.js";
import type { OmniCliResult } from "./types.js";

function getRootCommand(command: Command): Command {
  let current = command;
  while (current.parent) current = current.parent;
  return current;
}

function getFlags(command: Command): GlobalFlags {
  return getGlobalFlags(getRootCommand(command));
}

function timeoutFrom(flags: GlobalFlags, localTimeout?: string): number {
  if (localTimeout) return Number(localTimeout);
  if (typeof flags.timeout === "number") return flags.timeout;
  return 10_000;
}

function meta(id: string, summary: string): CommandMeta {
  return {
    id,
    summary,
    longDescription: summary,
    examples: [],
    related: ["omni", "doctor", "runtime"],
    tags: ["omni"],
    supportsJson: true,
    supportsPlan: true,
    supportsVerify: false,
    supportsExplain: true,
    requiresPT: true,
    status: "experimental",
  };
}

function makeOmniResult<T>(input: {
  ok: boolean;
  action: string;
  capabilityId?: string;
  risk: OmniRisk;
  payload?: unknown;
  value?: T;
  error?: { code?: string; message: string };
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
  nextSteps?: string[];
}): OmniCliResult<T> {
  return {
    schemaVersion: "1.0",
    ok: input.ok,
    action: input.action,
    capabilityId: input.capabilityId,
    risk: input.risk,
    payload: input.payload,
    value: input.value,
    error: input.error,
    warnings: input.warnings ?? [],
    evidence: input.evidence,
    confidence: input.confidence ?? (input.ok ? 1 : 0),
    nextSteps: input.nextSteps ?? [],
  };
}

function parsePayloadJson(value?: string): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("payload debe ser objeto JSON");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Payload JSON inválido: ${msg}`);
  }
}

export function createOmniCommand(): Command {
  const omni = new Command("omni")
    .alias("omniscience")
    .description("Acceso profundo, forense y experimental al motor interno de Packet Tracer")
    .summary("Backdoor controlado para capabilities y raw eval")
    .addHelpText(
      "after",
      `
Regla de uso:
  pt cmd    Para comandos normales IOS/Command Prompt
  pt set    Para propiedades/API/GUI de alto nivel
  pt omni   Para inspección profunda, fallback experimental o raw eval

Ejemplos seguros:
  pt omni status
  pt omni inspect env --json
  pt omni topology physical --json
  pt omni device genome R1 --json
  pt omni raw "n.getDeviceCount()" --approve --json

Raw recomendado para agentes:
  pt omni raw --file probe.js --approve --json
  pt omni raw --stdin --approve --json < probe.js

Notas:
  - omni raw ejecuta JavaScript dentro de Packet Tracer.
  - Usa --dry-run antes de scripts complejos.
  - Usa --unsafe --yes solo si sabes que el código toca APIs peligrosas.
`,
    );

  omni.addCommand(createOmniStatusCommand());
  omni.addCommand(createOmniRawCommand());
  omni.addCommand(createOmniInspectCommand());
  omni.addCommand(createOmniTopologyCommand());
  omni.addCommand(createOmniDeviceCommand());
  omni.addCommand(createOmniAssessmentCommand());
  omni.addCommand(createOmniCapabilityCommand());
  omni.addCommand(createOmniEnvCommand());

  return omni;
}

function createOmniStatusCommand(): Command {
  return new Command("status")
    .description("Verifica disponibilidad básica de Omni")
    .option("--timeout <ms>", "Timeout local")
    .action(async (options, command) => {
      const flags = getFlags(command);
      const timeoutMs = timeoutFrom(flags, options.timeout);

      const wrapped = await runCommand<OmniCliResult>({
        action: "omni.status",
        meta: meta("omni.status", "Verifica disponibilidad básica de Omni"),
        flags,
        payloadPreview: { timeoutMs },
        execute: async (ctx) => {
          const result = await ctx.controller.omniscience.runCapability(
            "omni.environment.inspect",
            { scope: "appWindow" },
            { timeoutMs },
          );

          const data = makeOmniResult({
            ok: result.ok,
            action: "omni.status",
            capabilityId: "omni.environment.inspect",
            risk: "safe",
            value: result.value,
            error: result.ok ? undefined : { code: result.code, message: result.error ?? "Omni no disponible" },
            warnings: result.warnings,
            evidence: result.evidence,
            confidence: result.confidence,
            nextSteps: result.ok
              ? ["pt omni inspect env --json", "pt omni topology physical --json"]
              : ["pt doctor", "pt runtime status", "pt runtime logs"],
          });

          if (!result.ok) {
            return createErrorResult("omni.status", {
              code: result.code ?? "OMNI_STATUS_FAILED",
              message: result.error ?? "Omni no disponible",
              details: data as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("omni.status", data);
        },
      });

      const data = wrapped.data ?? makeOmniResult({
        ok: false,
        action: "omni.status",
        risk: "safe",
        error: {
          code: wrapped.error?.code,
          message: wrapped.error?.message ?? "Omni status falló",
        },
        warnings: wrapped.warnings,
        nextSteps: ["pt doctor", "pt runtime status"],
      });

      printOmniResult(data, {
        json: flags.json,
        quiet: flags.quiet,
      });

      if (!wrapped.ok) process.exitCode = 1;
    });
}

function createOmniRawCommand(): Command {
  return new Command("raw")
    .description("Ejecuta JavaScript raw dentro del motor de Packet Tracer")
    .argument("[code...]", "Código JS. Recomendado: usar comillas, --file o --stdin")
    .option("--file <path>", "Leer código JS desde archivo")
    .option("--stdin", "Leer código JS desde stdin")
    .option("--wrap", "Envolver código como (function(){ ... })() para permitir return")
    .option("--parse-json", "Si el resultado es string JSON, parsearlo")
    .option("--dry-run", "Mostrar código final y política sin ejecutar")
    .option("-y, --yes", "Confirmar ejecución raw")
    .option("--approve", "Alias de --yes")
    .option("--unsafe", "Permitir patrones peligrosos detectados por el guard")
    .option("--guard <mode>", "strict|warn|off", "strict")
    .option("--raw", "Imprimir solo el valor resultante")
    .option("--save <path>", "Guardar resultado JSON completo en archivo")
    .option("--timeout <ms>", "Timeout local")
    .addHelpText(
      "after",
      `
Ejemplos:
  pt omni raw "n.getDeviceCount()" --yes
  pt omni raw "Object.keys(ipc).join(',')" --yes --raw
  pt omni raw --wrap "return n.getDeviceCount();" --yes --json
  pt omni raw --file scripts/probe.js --yes --json
  pt omni raw --stdin --yes --json < scripts/probe.js
  pt omni raw --file scripts/probe.js --dry-run

Si tu código contiene flags o guiones:
  pt omni raw --yes -- "n.getDeviceCount()"

Variables disponibles en runtime:
  ipc         API interna principal
  n           shortcut de ipc.network()
  w           logical workspace si está disponible
  global      scope raíz
  dprint      logger interno
  privileged  acceso privilegiado, bloqueado por defecto en guard strict
`,
    )
    .action(async (codeParts: string[], options, command) => {
      const flags = getFlags(command);
      const timeoutMs = timeoutFrom(flags, options.timeout);

      let code: string;
      try {
        code = readOmniCode({
          file: options.file,
          stdin: Boolean(options.stdin),
          codeParts,
          wrap: Boolean(options.wrap),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const data = makeOmniResult({
          ok: false,
          action: "omni.raw",
          capabilityId: "omni.evaluate.raw",
          risk: "dangerous",
          error: { code: "OMNI_RAW_INPUT_ERROR", message },
          nextSteps: [
            'pt omni raw "n.getDeviceCount()" --yes',
            "PT_OMNI_AUTO_APPROVE=1 pt omni raw --file probe.js --json",
          ],
        });
        printOmniResult(data, { json: flags.json, quiet: flags.quiet });
        process.exitCode = 2;
        return;
      }

      const policy = evaluateOmniRawPolicy(code, options.guard ?? "strict");

      if (options.dryRun) {
        const data = makeOmniResult({
          ok: policy.ok,
          action: "omni.raw.dry-run",
          capabilityId: "omni.evaluate.raw",
          risk: policy.risk,
          payload: { code },
          value: {
            code,
            policy,
            wouldExecute: policy.ok && (hasRawApproval(options) || flags.yes),
          },
          warnings: policy.warnings,
          confidence: 1,
          nextSteps: [
            'pt omni raw --file scripts/probe.js --yes --json',
            "pt omni status",
          ],
        });

        printOmniResult(data, {
          json: flags.json,
          raw: Boolean(options.raw),
          quiet: flags.quiet,
          save: options.save,
        });
        return;
      }

      if (!hasRawApproval(options)) {
        const data = makeOmniResult({
          ok: false,
          action: "omni.raw",
          capabilityId: "omni.evaluate.raw",
          risk: policy.risk,
          payload: { codePreview: code.slice(0, 500) },
          error: {
            code: "OMNI_RAW_APPROVAL_REQUIRED",
            message: "omni raw requiere --yes, --approve o PT_OMNI_AUTO_APPROVE=1",
          },
          warnings: policy.warnings,
          nextSteps: [
            'pt omni raw "n.getDeviceCount()" --yes',
            "PT_OMNI_AUTO_APPROVE=1 pt omni raw --file probe.js --json",
          ],
        });
        printOmniResult(data, { json: flags.json, quiet: flags.quiet });
        process.exitCode = 2;
        return;
      }

      if (!policy.ok && !options.unsafe) {
        const data = makeOmniResult({
          ok: false,
          action: "omni.raw",
          capabilityId: "omni.evaluate.raw",
          risk: policy.risk,
          payload: { codePreview: code.slice(0, 500), blockedPatterns: policy.blockedPatterns },
          error: {
            code: "OMNI_RAW_BLOCKED_BY_GUARD",
            message: `El guard bloqueó patrones peligrosos: ${policy.blockedPatterns.join(", ")}`,
          },
          warnings: policy.warnings,
          nextSteps: [
            "Revisa el código con: pt omni raw --file script.js --dry-run",
            "Si realmente quieres ejecutarlo: pt omni raw --file script.js --unsafe --approve",
          ],
        });

        printOmniResult(data, { json: flags.json, quiet: flags.quiet });
        process.exitCode = 2;
        return;
      }

      const wrapped = await runCommand<OmniCliResult>({
        action: "omni.raw",
        meta: meta("omni.raw", "Ejecuta JavaScript raw dentro de Packet Tracer"),
        flags,
        payloadPreview: {
          codeBytes: Buffer.byteLength(code, "utf-8"),
          codePreview: code.slice(0, 300),
          guard: options.guard ?? "strict",
          unsafe: Boolean(options.unsafe),
          timeoutMs,
        },
        execute: async (ctx) => {
          const result = await ctx.controller.omniscience.runCapability(
            "omni.evaluate.raw",
            { code },
            { timeoutMs, risk: "dangerous" },
          );

          const value = options.parseJson ? tryParseJsonValue(result.value) : result.value;

          const data = makeOmniResult({
            ok: result.ok,
            action: "omni.raw",
            capabilityId: "omni.evaluate.raw",
            risk: "dangerous",
            payload: {
              codeBytes: Buffer.byteLength(code, "utf-8"),
              codePreview: code.slice(0, 500),
              guard: options.guard ?? "strict",
              unsafe: Boolean(options.unsafe),
            },
            value,
            error: result.ok
              ? undefined
              : {
                  code: result.code ?? "OMNI_RAW_FAILED",
                  message: result.error ?? "Error ejecutando código raw",
                },
            warnings: [...policy.warnings, ...(result.warnings ?? [])],
            evidence: result.evidence,
            confidence: result.confidence,
            nextSteps: result.ok
              ? ["pt omni inspect env --json", "pt omni topology physical --json"]
              : ["pt doctor", "pt runtime logs", "pt omni status"],
          });

          if (!result.ok) {
            return createErrorResult("omni.raw", {
              code: result.code ?? "OMNI_RAW_FAILED",
              message: result.error ?? "Error ejecutando código raw",
              details: data as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("omni.raw", data, {
            warnings: data.warnings,
            advice: data.nextSteps,
            meta: { confidence: "unverified" },
          });
        },
      });

      const data = wrapped.data ?? makeOmniResult({
        ok: false,
        action: "omni.raw",
        capabilityId: "omni.evaluate.raw",
        risk: "dangerous",
        error: {
          code: wrapped.error?.code,
          message: wrapped.error?.message ?? "omni raw falló",
        },
        warnings: wrapped.warnings,
        nextSteps: ["pt doctor", "pt runtime logs"],
      });

      printOmniResult(data, {
        json: flags.json,
        raw: Boolean(options.raw) || flags.output === "text" && Boolean(options.raw),
        quiet: flags.quiet,
        save: options.save,
      });

      if (!wrapped.ok) process.exitCode = 1;
    });
}

function createOmniInspectCommand(): Command {
  const inspect = new Command("inspect")
    .description("Inspecciona entorno, procesos y global scope de Packet Tracer");

  inspect
    .command("env")
    .description("Inspecciona entorno de PT")
    .option("--scope <scope>", "appWindow|version|workspace|fileManager", "appWindow")
    .option("--timeout <ms>", "Timeout local")
    .action(async (options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.inspect.env",
        capabilityId: "omni.environment.inspect",
        risk: "safe",
        payload: { scope: options.scope },
        timeout: options.timeout,
      });
    });

  inspect
    .command("scope")
    .description("Inspecciona global scope")
    .option("--target <target>", "ipc|assessmentModel|dprint|scriptEngine|all", "all")
    .option("--timeout <ms>", "Timeout local")
    .action(async (options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.inspect.scope",
        capabilityId: "omni.globalscope.inspect",
        risk: "elevated",
        payload: { target: options.target },
        timeout: options.timeout,
      });
    });

  inspect
    .command("process")
    .description("Inspecciona procesos de dispositivos")
    .option("--name <processName>", "Filtrar por nombre de proceso")
    .option("--timeout <ms>", "Timeout local")
    .action(async (options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.inspect.process",
        capabilityId: "omni.process.inspect",
        risk: "elevated",
        payload: { processName: options.name },
        timeout: options.timeout,
      });
    });

  return inspect;
}

function createOmniTopologyCommand(): Command {
  const topology = new Command("topology")
    .description("Extrae información profunda de topología");

  topology
    .command("physical")
    .description("Extrae topología física desde Omni")
    .option("--timeout <ms>", "Timeout local")
    .action(async (options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.topology.physical",
        capabilityId: "omni.topology.physical",
        risk: "elevated",
        payload: {},
        timeout: options.timeout,
      });
    });

  return topology;
}

function createOmniDeviceCommand(): Command {
  const device = new Command("device")
    .description("Inspección profunda de dispositivos");

  device
    .command("genome")
    .alias("genoma")
    .description("Extrae XML/genoma interno de un dispositivo")
    .argument("<device>", "Nombre del dispositivo")
    .option("--timeout <ms>", "Timeout local")
    .action(async (deviceName: string, options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.device.genome",
        capabilityId: "omni.device.genoma",
        risk: "elevated",
        payload: { deviceName },
        timeout: options.timeout,
      });
    });

  device
    .command("port")
    .description("Extrae estadísticas profundas de un puerto")
    .argument("<device>", "Nombre del dispositivo")
    .argument("<port>", "Nombre del puerto")
    .option("--timeout <ms>", "Timeout local")
    .action(async (deviceName: string, portName: string, options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.device.port",
        capabilityId: "omni.device.portStats",
        risk: "elevated",
        payload: { deviceName, portName },
        timeout: options.timeout,
      });
    });

  return device;
}

function createOmniAssessmentCommand(): Command {
  const assessment = new Command("assessment")
    .description("Lee AssessmentModel cuando está disponible");

  assessment
    .command("running-config")
    .description("Lee running-config vía AssessmentModel")
    .argument("<device>", "Dispositivo")
    .option("--timeout <ms>", "Timeout local")
    .action(async (deviceId: string, options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.assessment.running-config",
        capabilityId: "omni.assessment.read",
        risk: "elevated",
        payload: { action: "getRunningConfig", deviceId },
        timeout: options.timeout,
      });
    });

  assessment
    .command("item")
    .description("Lee valor de item de assessment")
    .argument("<item-id>", "ID del item")
    .option("--timeout <ms>", "Timeout local")
    .action(async (itemId: string, options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.assessment.item",
        capabilityId: "omni.assessment.read",
        risk: "elevated",
        payload: { action: "getAssessmentItemValue", itemId },
        timeout: options.timeout,
      });
    });

  assessment
    .command("correct")
    .description("Consulta si un item de assessment está correcto")
    .argument("<item-id>", "ID del item")
    .option("--timeout <ms>", "Timeout local")
    .action(async (itemId: string, options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.assessment.correct",
        capabilityId: "omni.assessment.read",
        risk: "elevated",
        payload: { action: "isAssessmentItemCorrect", itemId },
        timeout: options.timeout,
      });
    });

  assessment
    .command("time")
    .description("Lee tiempo transcurrido del assessment")
    .option("--timeout <ms>", "Timeout local")
    .action(async (options, command) => {
      await runSimpleOmniCapability({
        command,
        action: "omni.assessment.time",
        capabilityId: "omni.assessment.read",
        risk: "elevated",
        payload: { action: "getTimeElapsed" },
        timeout: options.timeout,
      });
    });

  return assessment;
}

function createOmniEnvCommand(): Command {
  const env = new Command("env")
    .description("Manipula reglas de entorno de Packet Tracer");

  env
    .command("set")
    .description("Aplica reglas de entorno")
    .option("--no-anim", "Desactiva animación")
    .option("--no-sound", "Desactiva sonido")
    .option("--approve", "Confirmar operación experimental")
    .option("--timeout <ms>", "Timeout local")
    .action(async (options, command) => {
      const flags = getFlags(command);

      if (!options.approve && process.env.PT_OMNI_AUTO_APPROVE !== "1") {
        const data = makeOmniResult({
          ok: false,
          action: "omni.env.set",
          capabilityId: "omni.environment.rules",
          risk: "experimental",
          error: {
            code: "OMNI_ENV_APPROVAL_REQUIRED",
            message: "Modificar reglas de entorno requiere --approve",
          },
          nextSteps: ["pt omni env set --no-anim --no-sound --approve"],
        });

        printOmniResult(data, { json: flags.json, quiet: flags.quiet });
        process.exitCode = 2;
        return;
      }

      await runSimpleOmniCapability({
        command,
        action: "omni.env.set",
        capabilityId: "omni.environment.rules",
        risk: "experimental",
        payload: {
          rules: {
            animation: options.anim,
            sound: options.sound,
          },
        },
        timeout: options.timeout,
      });
    });

  return env;
}

function createOmniCapabilityCommand(): Command {
  const capability = new Command("capability")
    .description("Explora catálogo de capabilities");

  capability
    .command("list")
    .description("Lista capabilities registradas")
    .option("--domain <domain>", "Filtrar por dominio")
    .option("--risk <risk>", "Filtrar por riesgo")
    .option("--json", "Salida JSON local")
    .action((options) => {
      let caps = Object.values(OMNI_CAPABILITY_REGISTRY);

      if (options.domain) {
        caps = caps.filter((cap) => cap.domain === options.domain);
      }
      if (options.risk) {
        caps = caps.filter((cap) => cap.risk === options.risk);
      }

      if (options.json) {
        process.stdout.write(`${JSON.stringify(caps, null, 2)}\n`);
        return;
      }

      process.stdout.write(`\nCapabilities (${caps.length})\n`);
      for (const cap of caps) {
        const title = cap.description?.split(".")[0] ?? cap.id;
        process.stdout.write(`  ${cap.id.padEnd(36)} ${cap.risk.padEnd(12)} ${cap.domain} — ${title}\n`);
      }
      process.stdout.write("\nSiguiente:\n");
      process.stdout.write("  pt omni capability show <id>\n");
      process.stdout.write("  pt omni capability run <omni-capability-id> --payload-json '{}'\n\n");
    });

  capability
    .command("show")
    .description("Muestra detalle de una capability")
    .argument("<id>", "ID de capability")
    .option("--json", "Salida JSON local")
    .action((id: string, options) => {
      const cap = getCapabilityDef(id);

      if (!cap) {
        process.stderr.write(`Capability no encontrada: ${id}\n`);
        process.exitCode = 1;
        return;
      }

      if (options.json) {
        process.stdout.write(`${JSON.stringify(cap, null, 2)}\n`);
        return;
      }

      process.stdout.write(`\n${cap.id}\n`);
      process.stdout.write(`  Dominio: ${cap.domain}\n`);
      process.stdout.write(`  Riesgo: ${cap.risk}\n`);
      process.stdout.write(`  Descripción: ${cap.description ?? "N/A"}\n`);
      if (cap.prerequisites?.length) {
        process.stdout.write(`  Prerrequisitos: ${cap.prerequisites.join(", ")}\n`);
      }
      process.stdout.write("\n");
    });

  capability
    .command("run")
    .description("Ejecuta una capability Omni directa del RuntimeOmniPort")
    .argument("<id>", "Ej: omni.environment.inspect, omni.topology.physical")
    .option("--payload-json <json>", "Payload JSON")
    .option("--yes", "Confirmar capabilities elevadas/peligrosas")
    .option("--timeout <ms>", "Timeout local")
    .action(async (id: string, options, command) => {
      const payload = parsePayloadJson(options.payloadJson);
      await runSimpleOmniCapability({
        command,
        action: "omni.capability.run",
        capabilityId: id,
        risk: "experimental",
        payload,
        timeout: options.timeout,
        requireApproval: true,
        approved: Boolean(options.yes),
      });
    });

  return capability;
}

async function runSimpleOmniCapability(input: {
  command: Command;
  action: string;
  capabilityId: string;
  risk: OmniRisk;
  payload: unknown;
  timeout?: string;
  requireApproval?: boolean;
  approved?: boolean;
}): Promise<void> {
  const flags = getFlags(input.command);
  const timeoutMs = timeoutFrom(flags, input.timeout);

  if (input.requireApproval && !input.approved && process.env.PT_OMNI_AUTO_APPROVE !== "1") {
    const data = makeOmniResult({
      ok: false,
      action: input.action,
      capabilityId: input.capabilityId,
      risk: input.risk,
      payload: input.payload,
      error: {
        code: "OMNI_APPROVAL_REQUIRED",
        message: "Esta capability requiere --yes o PT_OMNI_AUTO_APPROVE=1",
      },
      nextSteps: [`pt omni capability run ${input.capabilityId} --payload-json '{}' --yes`],
    });

    printOmniResult(data, { json: flags.json, quiet: flags.quiet });
    process.exitCode = 2;
    return;
  }

  const wrapped = await runCommand<OmniCliResult>({
    action: input.action,
    meta: meta(input.action, `Ejecuta ${input.capabilityId}`),
    flags,
    payloadPreview: {
      capabilityId: input.capabilityId,
      payload: input.payload,
      timeoutMs,
    },
    execute: async (ctx) => {
      const result = await ctx.controller.omniscience.runCapability(
        input.capabilityId,
        input.payload,
        { timeoutMs, risk: input.risk },
      );

      const data = makeOmniResult({
        ok: result.ok,
        action: input.action,
        capabilityId: input.capabilityId,
        risk: input.risk,
        payload: input.payload,
        value: result.value,
        error: result.ok
          ? undefined
          : {
              code: result.code,
              message: result.error ?? `Falló ${input.capabilityId}`,
            },
        warnings: result.warnings,
        evidence: result.evidence,
        confidence: result.confidence,
        nextSteps: result.ok
          ? ["pt omni status", "pt verify all"]
          : ["pt doctor", "pt runtime logs", "pt omni status"],
      });

      if (!result.ok) {
        return createErrorResult(input.action, {
          code: result.code ?? "OMNI_CAPABILITY_FAILED",
          message: result.error ?? `Falló ${input.capabilityId}`,
          details: data as unknown as Record<string, unknown>,
        });
      }

      return createSuccessResult(input.action, data, {
        warnings: data.warnings,
        advice: data.nextSteps,
        meta: { confidence: "unverified" },
      });
    },
  });

  const data = wrapped.data ?? makeOmniResult({
    ok: false,
    action: input.action,
    capabilityId: input.capabilityId,
    risk: input.risk,
    payload: input.payload,
    error: {
      code: wrapped.error?.code,
      message: wrapped.error?.message ?? `Falló ${input.capabilityId}`,
    },
    warnings: wrapped.warnings,
    nextSteps: ["pt doctor", "pt runtime logs"],
  });

  printOmniResult(data, {
    json: flags.json,
    quiet: flags.quiet,
  });

  if (!wrapped.ok) process.exitCode = 1;
}
