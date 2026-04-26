#!/usr/bin/env bun
import { Command } from "commander";

export type OutputFormat = "text" | "json" | "table" | "raw";

export interface GlobalFlags {
  json: boolean;
  jq: string | null;
  output: OutputFormat;
  verbose: boolean;
  quiet: boolean;
  trace: boolean;
  tracePayload: boolean;
  traceResult: boolean;
  traceDir: string | null;
  traceBundle: boolean;
  traceBundlePath: string | null;
  sessionId: string | null;
  examples: boolean;
  schema: boolean;
  explain: boolean;
  plan: boolean;
  verify: boolean;
  timeout?: number | null;
  noTimeout: boolean;
  table: boolean;
  raw: boolean;
  yes: boolean;
  noInput: boolean;
  noColor: boolean;
}

export function addGlobalFlags(program: Command): Command {
  return program
    .option("-j, --json", "Salida JSON estable para agentes/scripts", false)
    .option("--table", "Forzar salida tabular cuando el comando la soporte", false)
    .option("--raw", "Imprimir solo salida cruda del dispositivo cuando aplique", false)
    .option("-v, --verbose", "Mostrar detalles adicionales y diagnóstico", false)
    .option("-q, --quiet", "Reducir salida humana no esencial", false)
    .option("--trace", "Guardar traza estructurada de ejecución", false)
    .option("--trace-payload", "Incluir payload redactado en la traza", false)
    .option("--trace-result", "Incluir preview del resultado en la traza", false)
    .option("--trace-dir <dir>", "Sobrescribir directorio de logs", undefined)
    .option("--trace-bundle", "Generar archivo bundle único para debugging", false)
    .option("--trace-bundle-path <path>", "Ruta personalizada para el archivo bundle", undefined)
    .option("--session-id <id>", "ID de sesión manual para agrupar acciones", undefined)
    .option("--examples", "Mostrar ejemplos de uso del comando y salir", false)
    .option("--schema", "Mostrar schema JSON del resultado y salir", false)
    .option("--explain", "Explicar qué hace el comando y salir", false)
    .option("--plan", "Mostrar plan de ejecución sin ejecutar", false)
    .option("--verify", "Verificar cambios post-ejecución", true)
    .option("--no-verify", "Omitir verificación post-ejecución", false)
    .option("--timeout <ms>", "Timeout global para operaciones en milisegundos", undefined)
    .option("--no-timeout", "Desactivar timeout global", false)
    .option("-y, --yes", "Aceptar confirmaciones no destructivas", false)
    .option("--no-input", "No hacer prompts interactivos; fallar si faltan datos", false)
    .option("--no-color", "Desactivar color ANSI", false);
}

export function getGlobalFlags(command: Command): GlobalFlags {
  const opts = command.optsWithGlobals?.() ?? command.opts();

  return {
    json: Boolean(opts.json),
    jq: opts.jq ?? null,
    output: (opts.output as OutputFormat) ?? "text",
    verbose: Boolean(opts.verbose),
    quiet: Boolean(opts.quiet),
    trace: Boolean(opts.trace),
    tracePayload: Boolean(opts.tracePayload),
    traceResult: Boolean(opts.traceResult),
    traceDir: opts.traceDir ?? null,
    traceBundle: Boolean(opts.traceBundle),
    traceBundlePath: opts.traceBundlePath ?? null,
    sessionId: opts.sessionId ?? null,
    examples: Boolean(opts.examples),
    schema: Boolean(opts.schema),
    explain: Boolean(opts.explain),
    plan: Boolean(opts.plan),
    verify: Boolean(opts.verify),
    timeout: typeof opts.timeout === "number" && Number.isFinite(opts.timeout) ? opts.timeout : null,
    noTimeout: Boolean(opts.noTimeout),
    table: Boolean(opts.table),
    raw: Boolean(opts.raw),
    yes: Boolean(opts.yes),
    noInput: Boolean(opts.noInput),
    noColor: Boolean(opts.color === false || opts.noColor),
  };
}

export function wantsJson(flags: Pick<GlobalFlags, "json">): boolean {
  return flags.json;
}

export function wantsHuman(flags: Pick<GlobalFlags, "json" | "quiet">): boolean {
  return !flags.json && !flags.quiet;
}