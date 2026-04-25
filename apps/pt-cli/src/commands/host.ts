#!/usr/bin/env bun
/**
 * Comando host - Gestión de dispositivos host (PC/Server-PT)
 */

import { Command } from "commander";
import chalk from "chalk";
import { input, select } from "@inquirer/prompts";

import {
  buildHostConfigPlanText,
  executeHostCommand,
  executeHostConfig,
  executeHostHistory,
  executeHostInspect,
  type HostConfigResult,
  type HostExecResult,
  type HostHistoryResult,
  type HostInspectResult,
} from "@cisco-auto/pt-control/application/host";

import type { CliResult } from "../contracts/cli-result.js";
import { createErrorResult, createSuccessResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";
import type { GlobalFlags } from "../flags.js";
import { runCommand } from "../application/run-command.js";
import { printExamples } from "../ux/examples.js";
import { fetchDeviceList, formatDevice } from "../utils/device-utils.js";

const HOST_CONFIG_META: CommandMeta = {
  id: "host.config",
  summary: "Configurar red del host (IP, gateway, DNS, DHCP)",
  longDescription: "Configura los parámetros de red de un dispositivo host (PC/Server-PT) en Packet Tracer, incluyendo dirección IP, máscara, gateway, DNS y DHCP.",
  examples: [
    { command: "pt host config PC1 --ip 192.168.1.10 --mask 255.255.255.0 --gateway 192.168.1.1", description: "Configurar IP estática en PC1" },
    { command: "pt host config PC1 --dhcp", description: "Habilitar DHCP en PC1" },
    { command: "pt host config PC1 --ip 192.168.1.10 --mask 255.255.255.0 --gateway 192.168.1.1 --dns 8.8.8.8", description: "Configurar IP con DNS" },
  ],
  related: ["device get", "show ip interface brief"],
  nextSteps: ["pt host inspect <device>"],
  tags: ["host", "config", "ip", "dhcp"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

const HOST_INSPECT_META: CommandMeta = {
  id: "host.inspect",
  summary: "Inspeccionar estado del host",
  longDescription: "Obtiene información detallada de la configuración de red de un dispositivo host (PC/Server-PT).",
  examples: [
    { command: "pt host inspect PC1", description: "Inspeccionar configuración de PC1" },
    { command: "pt host inspect Server1 --json", description: "Inspeccionar Server1 en formato JSON" },
  ],
  related: ["device get", "host config"],
  nextSteps: ["pt host config <device>"],
  tags: ["host", "inspect", "info"],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true,
};

const HOST_EXEC_META: CommandMeta = {
  id: "host.exec",
  summary: "Ejecutar comando en el Command Prompt del host",
  longDescription: "Ejecuta un comando directamente en el Command Prompt de una PC o Servidor y devuelve la salida procesada.",
  examples: [
    { command: 'pt host exec PC1 "ipconfig"', description: "Ver configuración IP de PC1" },
    { command: 'pt host exec PC1 "nslookup google.com"', description: "Probar resolución DNS en PC1" },
    { command: 'pt host exec PC1 "netstat"', description: "Ver conexiones activas en PC1" },
  ],
  related: ["ping", "host inspect"],
  nextSteps: ["pt host inspect <device>"],
  tags: ["host", "exec", "command", "prompt"],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true,
};

const HOST_HISTORY_META: CommandMeta = {
  id: "host.history",
  summary: "Ver historial del host",
  longDescription: "Muestra el historial de comandos ejecutados en la consola del host.",
  examples: [
    { command: "pt host history PC1", description: "Ver historial de comandos de PC1" },
  ],
  related: ["host exec", "host inspect"],
  nextSteps: ["pt host exec <device> ipconfig"],
  tags: ["host", "history"],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true,
};

function makeFlagsFromProcess(overrides: Partial<GlobalFlags> = {}): GlobalFlags {
  return {
    json: process.argv.includes("--json"),
    jq: null,
    output: "text",
    verbose: process.argv.includes("--verbose"),
    quiet: process.argv.includes("--quiet"),
    trace: process.argv.includes("--trace"),
    tracePayload: false,
    traceResult: false,
    traceDir: null,
    traceBundle: false,
    traceBundlePath: null,
    sessionId: null,
    examples: process.argv.includes("--examples"),
    schema: process.argv.includes("--schema"),
    explain: process.argv.includes("--explain"),
    plan: process.argv.includes("--plan"),
    verify: !process.argv.includes("--no-verify"),
    ...overrides,
  };
}

async function promptForHostDevice(controller: unknown): Promise<string> {
  const devices = await fetchDeviceList(controller as never);
  if (devices.length === 0) throw new Error("No hay dispositivos en la topología");
  const hostDevices = devices.filter((device) => device.type === "pc" || device.type === "server");
  if (hostDevices.length === 0) throw new Error("No hay dispositivos host (PC/Server-PT) en la topología");
  return select({
    message: "Selecciona dispositivo host",
    choices: hostDevices.map((device) => ({ name: formatDevice(device), value: device.name })),
  });
}

function printHostConfigResult(result: CliResult<HostConfigResult>, flags: GlobalFlags): void {
  if (flags.json) { console.log(JSON.stringify(result, null, 2)); return; }
  if (!result.ok) { console.error(`\n❌ Error: ${result.error?.message ?? "Error desconocido"}`); if (result.error?.details) console.error("Detalles:", result.error.details); process.exit(1); }
  if (!result.data) return;
  console.log(`\n✓ Host ${result.data.device} configurado`);
  if (result.data.dhcp) {
    console.log("  DHCP: habilitado");
  } else {
    console.log(`  IP: ${result.data.ip}/${result.data.mask}`);
    if (result.data.gateway) console.log(`  Gateway: ${result.data.gateway}`);
    if (result.data.dns) console.log(`  DNS: ${result.data.dns}`);
  }
  if (result.advice?.length) { console.log("\nSiguientes pasos:"); result.advice.forEach((step) => console.log(`  ${step}`)); }
}

function printHostInspectResult(result: CliResult<HostInspectResult>, flags: GlobalFlags): void {
  if (flags.json) { console.log(JSON.stringify(result, null, 2)); return; }
  if (!result.ok) { console.error(`\n❌ Error: ${result.error?.message ?? "Error desconocido"}`); if (result.error?.details) console.error("Detalles:", result.error.details); process.exit(1); }
  if (!result.data) return;
  console.log(`\n📱 ${result.data.name}:`);
  console.log("━".repeat(60));
  console.log(`Tipo: ${result.data.type}`);
  console.log(`Modelo: ${result.data.model}`);
  if (result.data.dhcp !== undefined) console.log(`DHCP: ${result.data.dhcp ? "Sí" : "No"}`);
  if (result.data.ip) console.log(`IP: ${result.data.ip}/${result.data.mask ?? "N/A"}`);
  if (result.data.gateway) console.log(`Gateway: ${result.data.gateway}`);
  if (result.data.dns) console.log(`DNS: ${result.data.dns}`);
  if (result.advice?.length) { console.log("\nSiguientes pasos:"); result.advice.forEach((step) => console.log(`  ${step}`)); }
}

function printHostHistoryResult(result: CliResult<HostHistoryResult>, flags: GlobalFlags): void {
  if (flags.json) { console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1; return; }
  if (!result.ok) { console.error(`\n❌ Error: ${result.error?.message ?? "Error desconocido"}`); process.exit(1); }
  if (!result.data) return;
  const device = chalk.bold.cyan(result.data.device);
  console.log(`\n📜 HISTORIAL DE CONSOLA (${device}):`);
  console.log(chalk.gray("━".repeat(60)));
  result.data.entries.forEach((entry, index) => {
    console.log(`${chalk.gray(`${index + 1}.`)} ${chalk.yellow(">")} ${chalk.bold(entry.command)}`);
    if (entry.output) console.log(chalk.white(entry.output));
    console.log(chalk.gray("─".repeat(40)));
  });
  if (result.data.count === 0) console.log(chalk.italic("El historial está vacío o no se pudo parsear."));
}

function getErrorConsoleOutput(result: CliResult<unknown>): string {
  const details = result.error?.details as Record<string, unknown> | undefined;
  return String(details?.output ?? (details?.evidence as { raw?: string } | undefined)?.raw ?? (details?.parsed as { raw?: string; output?: string } | undefined)?.raw ?? (details?.parsed as { output?: string } | undefined)?.output ?? "");
}

function printFailedConsoleOutput(result: CliResult<unknown>): void {
  const details = result.error?.details as Record<string, unknown> | undefined;
  const device = details?.device ?? "dispositivo";
  const output = getErrorConsoleOutput(result);
  console.error(`\n📟 SALIDA DE CONSOLA (${device}):`);
  console.error("━".repeat(60));
  if (output.trim()) { console.error(output); } else { console.error(chalk.italic.gray("  (No se capturó salida de consola para este error)")); }
  console.error("━".repeat(60));
}

function printHostExecResult(result: CliResult<HostExecResult>, flags: GlobalFlags): void {
  if (flags.json) { console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1; return; }
  if (!result.ok) { printFailedConsoleOutput(result); console.error(`❌ Error: ${result.error?.message ?? "Error desconocido"}`); process.exit(1); }
  if (!result.data) return;
  console.log(`\n📟 SALIDA DE CONSOLA (${result.data.device}):`);
  console.log("━".repeat(60));
  if (result.data.output) { console.log(result.data.output); } else { console.log(chalk.italic.gray("  (Salida vacía o filtrada por el sistema)")); if (flags.verbose) { console.log(chalk.yellow("\nDEBUG: Objeto result:")); console.log(JSON.stringify(result, null, 2)); } }
  console.log("━".repeat(60));
  if (result.data.success) {
    const outputLen = result.data.output?.length ?? 0;
    console.log(`✅ Ejecución exitosa (${outputLen} chars capturados)`);
  } else {
    const reason = result.data.verdict?.reason ?? "Resultado no satisfactorio";
    console.log(`❌ Fallo detectado: ${reason}`);
    if (result.data.verdict?.warnings?.length) result.data.verdict.warnings.forEach((warning) => console.log(`   ⚠️  ${warning}`));
  }
}

export function createHostCommand(): Command {
  const host = new Command("host").description("Gestionar dispositivos host (PC/Server-PT)");
  host.addCommand(createHostConfigCommand());
  host.addCommand(createHostInspectCommand());
  host.addCommand(createHostExecCommand());
  host.addCommand(createHostHistoryCommand());
  return host;
}

export function createCmdShortcutCommand(): Command {
  return createHostExecCommand().name("cmd").alias("exec-pc").description("Acceso rápido para ejecutar comandos en un host");
}

export function createHistoryShortcutCommand(): Command {
  return createHostHistoryCommand().name("history").description("Acceso rápido para ver el historial de comandos de un host");
}

function createHostHistoryCommand(): Command {
  return new Command("history")
    .description("Ver el historial de comandos ejecutados en el host")
    .argument("<device>", "Nombre del dispositivo")
    .option("--json", "Salida en formato JSON")
    .action(async (deviceName, _options, cmd) => {
      const flags = (cmd.optsWithGlobals?.() ?? makeFlagsFromProcess()) as GlobalFlags;
      const result = await runCommand<HostHistoryResult>({
        action: "host.history",
        meta: HOST_HISTORY_META,
        flags,
        payloadPreview: { device: deviceName },
        execute: async (ctx): Promise<CliResult<HostHistoryResult>> => {
          const execution = await executeHostHistory(ctx.controller, { deviceName });
          if (!execution.ok) return createErrorResult("host.history", execution.error);
          return createSuccessResult("host.history", execution.data, { advice: execution.advice });
        },
      });
      printHostHistoryResult(result, flags);
    });
}

function createHostExecCommand(): Command {
  return new Command("exec")
    .alias("cmd")
    .summary(HOST_EXEC_META.summary)
    .description(HOST_EXEC_META.longDescription ?? HOST_EXEC_META.summary)
    .argument("[device]", "Nombre del dispositivo")
    .argument("[command...]", "Comando a ejecutar")
    .option("--json", "Salida en formato JSON")
    .option("--timeout <ms>", "Timeout de ejecución", (value) => Number(value), 45000)
    .action(async (deviceName, commandParts, options, cmd) => {
      const flags = (cmd.optsWithGlobals?.() ?? makeFlagsFromProcess()) as GlobalFlags;
      const result = await runCommand<HostExecResult>({
        action: "host.exec",
        meta: HOST_EXEC_META,
        flags,
        payloadPreview: { device: deviceName, command: commandParts },
        execute: async (ctx): Promise<CliResult<HostExecResult>> => {
          let finalDevice = deviceName;
          let finalCommand = Array.isArray(commandParts) ? commandParts.join(" ") : commandParts;
          if (!finalDevice) finalDevice = await promptForHostDevice(ctx.controller);
          if (!finalCommand) {
            finalCommand = await input({
              message: "Introduce el comando a ejecutar (ej: ipconfig, nslookup, netstat, arp -a):",
              validate: (value) => value.trim().length > 0 || "El comando no puede estar vacío",
            });
          }
          if (!flags.quiet && !flags.json) process.stdout.write(chalk.cyan(`\n⏳ Esperando respuesta de ${chalk.bold(finalDevice)}... `));
          const execution = await executeHostCommand(ctx.controller, { deviceName: finalDevice, command: finalCommand, timeoutMs: options.timeout });
          if (!flags.quiet && !flags.json) process.stdout.write(execution.ok ? chalk.green("¡RECIBIDA!\n") : chalk.red("¡FALLÓ!\n"));
          if (!execution.ok) return createErrorResult("host.exec", execution.error);
          return createSuccessResult("host.exec", execution.data, { advice: execution.advice });
        },
      });
      printHostExecResult(result, flags);
    });
}

function createHostConfigCommand(): Command {
  return new Command("config")
    .description("Configurar red del host")
    .argument("[device]", "Nombre del dispositivo")
    .option("--ip <ip>", "Dirección IPv4")
    .option("--mask <mask>", "Máscara de subred")
    .option("--gateway <gateway>", "Gateway por defecto")
    .option("--dns <dns>", "Servidor DNS")
    .option("--dhcp", "Habilitar DHCP", false)
    .option("-i, --interactive", "Completar datos faltantes de forma interactiva", false)
    .option("--examples", "Mostrar ejemplos de uso y salir", false)
    .option("--schema", "Mostrar schema JSON del resultado y salir", false)
    .option("--explain", "Explicar qué hace el comando y salir", false)
    .option("--plan", "Mostrar plan de ejecución sin ejecutar", false)
    .option("--verify", "Verificar cambios post-ejecución", true)
    .option("--no-verify", "Omitir verificación post-ejecución", false)
    .option("--trace", "Activar traza estructurada de la ejecución", false)
    .action(async (device, options, cmd) => {
      const flags = makeFlagsFromProcess({
        json: process.argv.includes("--json"),
        trace: process.argv.includes("--trace"),
        plan: process.argv.includes("--plan"),
        verify: options.verify ?? true,
      });

      if (flags.examples) { console.log(printExamples(HOST_CONFIG_META)); return; }
      if (flags.schema) { console.log(JSON.stringify(HOST_CONFIG_META, null, 2)); return; }
      if (flags.explain) { console.log(HOST_CONFIG_META.longDescription ?? HOST_CONFIG_META.summary); return; }
      if (flags.plan) {
        console.log(buildHostConfigPlanText({ deviceName: device, ip: options.ip, mask: options.mask, gateway: options.gateway, dns: options.dns, dhcp: options.dhcp ?? false }));
        return;
      }

      let deviceName = device;
      let ipAddress = options.ip;
      let subnetMask = options.mask;
      let gatewayAddr = options.gateway;
      const dnsServer = options.dns;
      const dhcpEnabled = options.dhcp ?? false;

      const result = await runCommand<HostConfigResult>({
        action: "host.config",
        meta: HOST_CONFIG_META,
        flags,
        payloadPreview: { device: deviceName, ip: ipAddress, mask: subnetMask, gateway: gatewayAddr, dns: dnsServer, dhcp: dhcpEnabled },
        execute: async (ctx): Promise<CliResult<HostConfigResult>> => {
          if (!deviceName && !options.interactive) return createErrorResult("host.config", { code: "HOST_DEVICE_REQUIRED", message: "Debes pasar el dispositivo o usar --interactive", details: { device: deviceName } });
          if (!deviceName) deviceName = await promptForHostDevice(ctx.controller);
          if (!dhcpEnabled) {
            if (!ipAddress && !options.interactive) return createErrorResult("host.config", { code: "HOST_STATIC_CONFIG_REQUIRED", message: "Debes pasar IP y máscara, o usar --interactive", details: { device: deviceName } });
            if (!ipAddress) ipAddress = await input({ message: "Dirección IP:", validate: (value) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || "IP inválida (formato: x.x.x.x)" });
            if (!subnetMask && !options.interactive) return createErrorResult("host.config", { code: "HOST_STATIC_CONFIG_REQUIRED", message: "Debes pasar IP y máscara, o usar --interactive", details: { device: deviceName } });
            if (!subnetMask) subnetMask = await input({ message: "Máscara (ej: 255.255.255.0):", default: "255.255.255.0", validate: (value) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || "Máscara inválida" });
            if (!gatewayAddr && options.interactive) gatewayAddr = await input({ message: "Gateway (opcional):", validate: (value) => { if (!value) return true; return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || "Gateway inválido"; } });
          }
          const execution = await executeHostConfig(ctx.controller, { deviceName, ip: ipAddress, mask: subnetMask, gateway: gatewayAddr, dns: dnsServer, dhcp: dhcpEnabled });
          if (!execution.ok) return createErrorResult("host.config", execution.error);
          return createSuccessResult("host.config", execution.data, { advice: execution.advice });
        },
      });
      printHostConfigResult(result, flags);
    });
}

function createHostInspectCommand(): Command {
  return new Command("inspect")
    .description("Inspeccionar estado del host")
    .argument("<device>", "Nombre del dispositivo (ej: PC1, Server1)")
    .option("--json", "Salida en formato JSON")
    .option("--examples", "Mostrar ejemplos de uso y salir", false)
    .option("--schema", "Mostrar schema JSON del resultado y salir", false)
    .option("--explain", "Explicar qué hace el comando y salir", false)
    .action(async (deviceName) => {
      const flags = makeFlagsFromProcess({ plan: false, verify: false });
      if (flags.examples) { console.log(printExamples(HOST_INSPECT_META)); return; }
      if (flags.schema) { console.log(JSON.stringify(HOST_INSPECT_META, null, 2)); return; }
      if (flags.explain) { console.log(HOST_INSPECT_META.longDescription ?? HOST_INSPECT_META.summary); return; }
      const result = await runCommand<HostInspectResult>({
        action: "host.inspect",
        meta: HOST_INSPECT_META,
        flags,
        payloadPreview: { deviceName },
        execute: async (ctx): Promise<CliResult<HostInspectResult>> => {
          const execution = await executeHostInspect(ctx.controller, { deviceName });
          if (!execution.ok) return createErrorResult("host.inspect", execution.error);
          return createSuccessResult("host.inspect", execution.data, { advice: execution.advice });
        },
      });
      printHostInspectResult(result, flags);
    });
}