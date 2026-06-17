import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { createTerminalCommandService } from "@cisco-auto/pt-control/services";
import { runCommand } from "../../../application/run-command.js";
import { createSuccessResult, createErrorResult } from "../../../contracts/cli-result.js";
import { getGlobalFlags } from "../../../flags.js";
import { type VerifyResult, printVerifyResult } from "../helpers.js";

export function registerServicesCommands(verify: Command): void {
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
}
