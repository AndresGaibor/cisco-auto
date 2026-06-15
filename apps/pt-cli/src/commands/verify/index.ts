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
  pt verify ospf R1
  pt verify routing R1 10.0.0.0
  pt verify stp SW1 10
  pt verify etherchannel SW1
  pt verify hsrp R1 1
  pt verify nat R1
  pt verify cdp SW1
  pt verify ipv6 R1
  pt verify wlc WLC1

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
    .command("dhcp")
    .description("Valida que un host haya recibido IP por DHCP")
    .argument("<host>", "PC o Server a verificar")
    .action(async (host: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.dhcp",
        meta: {
          id: "verify.dhcp",
          summary: "Validar DHCP",
          examples: [],
          related: ["set host", "cmd"],
          tags: ["verify", "dhcp"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { host },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `verify-dhcp-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(host, "ipconfig", {
            timeoutMs: flags.timeout ?? 20000,
            mode: "safe",
          });

          const ok = result.ok && !result.output.includes("0.0.0.0") && (result.output.includes("192.") || result.output.includes("172.") || result.output.includes("10."));

          const verifyResult: VerifyResult = {
            check: "dhcp",
            ok,
            source: host,
            evidence: [result.output],
            probableCause: ok 
              ? undefined 
              : "El host no tiene IP válida (0.0.0.0 o APIPA 169.254.x.x). Revisa servidor DHCP, relay o VLAN.",
            nextSteps: ok
              ? [`pt verify ping ${host} <gateway>`]
              : [
                  `pt set host ${host} dhcp`,
                  `pt cmd <router_dhcp_server> "show ip dhcp pool"`,
                  `pt verify vlan <switch> <vlan_host>`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.dhcp", {
              code: "VERIFY_DHCP_FAILED",
              message: `DHCP no validado en ${host}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.dhcp", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

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

  verify
    .command("hsrp")
    .description("Valida estado de HSRP (redundancia de gateway)")
    .argument("<device>", "Router a verificar")
    .argument("[group]", "Grupo HSRP (ej: 1)", "1")
    .action(async (device: string, group: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.hsrp",
        meta: {
          id: "verify.hsrp",
          summary: "Validar HSRP",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "hsrp"],
          supportsJson: true,
          supportsPlan: false,
          supportsVerify: false,
          supportsExplain: true,
        },
        flags: {
          ...flags,
          output: "text",
        },
        payloadPreview: { device, group },
        execute: async (ctx) => {
          const service = createTerminalCommandService({
            controller: ctx.controller as any,
            runtimeTerminal: null,
            generateId: () => `verify-hsrp-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(device, `show standby brief`, {
            timeoutMs: flags.timeout ?? 30000,
            mode: "safe",
          });

          const ok = result.ok && 
                     (result.output.toLowerCase().includes("active") || result.output.toLowerCase().includes("standby")) &&
                     !result.output.toLowerCase().includes("init") &&
                     !result.output.toLowerCase().includes("listen");

          const verifyResult: VerifyResult = {
            check: "hsrp",
            ok,
            source: device,
            target: group,
            evidence: [result.output],
            probableCause: ok 
              ? undefined 
              : "HSRP no está en estado estable (Active/Standby). Revisa configuración, VLANs o conectividad entre routers.",
            nextSteps: ok
              ? [`pt cmd ${device} "show standby"`]
              : [
                  `pt cmd ${device} "show ip interface brief"`,
                  `pt cmd ${device} "show standby brief"`,
                  `pt verify ping ${device} <ip_peer_router>`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.hsrp", {
              code: "VERIFY_HSRP_FAILED",
              message: `HSRP no validado en ${device} para grupo ${group}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.hsrp", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  verify
    .command("nat")
    .description("Valida traducciones NAT activas")
    .argument("<device>", "Router a verificar")
    .action(async (device: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.nat",
        meta: {
          id: "verify.nat",
          summary: "Validar NAT",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "nat"],
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
            generateId: () => `verify-nat-${randomUUID().slice(0, 8)}`,
          });

          // Primero forzar un ping para generar tráfico si es posible
          // Pero aquí solo verificamos si hay config y estadísticas
          const stats = await service.executeCommand(device, "show ip nat statistics", {
            timeoutMs: flags.timeout ?? 20000,
            mode: "safe",
          });

          const trans = await service.executeCommand(device, "show ip nat translations", {
            timeoutMs: flags.timeout ?? 20000,
            mode: "safe",
          });

          const hasInside = stats.output.toLowerCase().includes("inside interface");
          const hasOutside = stats.output.toLowerCase().includes("outside interface");
          const ok = stats.ok && hasInside && hasOutside;

          const verifyResult: VerifyResult = {
            check: "nat",
            ok,
            source: device,
            evidence: [stats.output, trans.output],
            probableCause: ok 
              ? undefined 
              : !hasInside || !hasOutside 
                ? "Faltan interfaces NAT (inside/outside). Revisa 'ip nat inside' e 'ip nat outside'." 
                : "NAT no está operando. Revisa ACLs y pool de direcciones.",
            nextSteps: ok
              ? [`pt cmd ${device} "show ip nat translations"`]
              : [
                  `pt cmd ${device} "show running-config | include nat"`,
                  `pt cmd ${device} "show ip nat statistics"`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.nat", {
              code: "VERIFY_NAT_FAILED",
              message: `NAT no validado en ${device}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.nat", verifyResult, {
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

  verify
    .command("ipv6")
    .description("Valida direccionamiento y routing IPv6")
    .argument("<device>", "Dispositivo a verificar")
    .action(async (device: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.ipv6",
        meta: {
          id: "verify.ipv6",
          summary: "Validar IPv6",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "ipv6"],
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
            generateId: () => `verify-ipv6-${randomUUID().slice(0, 8)}`,
          });

          const result = await service.executeCommand(device, "show ipv6 interface brief", {
            timeoutMs: flags.timeout ?? 20000,
            mode: "safe",
          });

          const ok = result.ok && result.output.includes(":");

          const verifyResult: VerifyResult = {
            check: "ipv6",
            ok,
            source: device,
            evidence: [result.output],
            probableCause: ok ? undefined : "IPv6 no parece estar configurado o activo en las interfaces.",
            nextSteps: ok
              ? [`pt cmd ${device} "show ipv6 route"`]
              : [
                  `pt cmd ${device} --config "ipv6 unicast-routing"`,
                  `pt cmd ${device} "show ipv6 interface brief"`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.ipv6", {
              code: "VERIFY_IPV6_FAILED",
              message: `IPv6 no validado en ${device}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.ipv6", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  verify
    .command("wlc")
    .description("Valida estado de WLC y APs asociados")
    .argument("<device>", "Wireless LAN Controller")
    .action(async (device: string, _options, command) => {
      const flags = getGlobalFlags(command);

      const wrapped = await runCommand<VerifyResult>({
        action: "verify.wlc",
        meta: {
          id: "verify.wlc",
          summary: "Validar WLC",
          examples: [],
          related: ["cmd"],
          tags: ["verify", "wlc", "wireless"],
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
            generateId: () => `verify-wlc-${randomUUID().slice(0, 8)}`,
          });

          const summary = await service.executeCommand(device, "show ap summary", {
            timeoutMs: flags.timeout ?? 30000,
            mode: "safe",
          });

          const ok = summary.ok && (summary.output.includes("AP Name") || summary.output.includes("Ethernet"));

          const verifyResult: VerifyResult = {
            check: "wlc",
            ok,
            source: device,
            evidence: [summary.output],
            probableCause: ok ? undefined : "WLC no tiene APs asociados o no está operativo.",
            nextSteps: ok
              ? [`pt cmd ${device} "show wireless client summary"`]
              : [
                  `pt cmd ${device} "show ap summary"`,
                  `pt inspect topology`,
                  `pt verify ping <ap_ip> <wlc_ip>`,
                ],
          };

          if (!ok) {
            return createErrorResult("verify.wlc", {
              code: "VERIFY_WLC_FAILED",
              message: `WLC no validado en ${device}`,
              details: verifyResult as unknown as Record<string, unknown>,
            });
          }

          return createSuccessResult("verify.wlc", verifyResult, {
            advice: verifyResult.nextSteps,
          });
        },
      });

      printVerifyResult(wrapped, flags);
      if (!wrapped.ok) process.exitCode = 1;
    });

  return verify;
}
