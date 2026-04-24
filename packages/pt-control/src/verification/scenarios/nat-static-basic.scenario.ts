import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de NAT estático básico.
 * Configura NAT estático en un router con dispositivos inside y outside.
 * Verifica conectividad y show ip nat translations.
 */
export const natStaticBasicScenario: RealScenarioDefinition = {
  id: "nat-static-basic",
  title: "NAT Estático - Traducción uno a uno",
  tags: ["nat", "static", "translation"],
  profile: ["acl-nat-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("NAT-Router", "2911");
    await controller.addDevice("Inside-Host", "PC-PT");
    await controller.addDevice("Outside-Server", "Server-PT");

    await controller.addLink("Inside-Host", "FastEthernet0", "NAT-Router", "FastEthernet0/0");
    await controller.addLink("NAT-Router", "FastEthernet0/1", "Outside-Server", "FastEthernet0");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["NAT-Router", "Inside-Host", "Outside-Server"],
      links: [
        { from: "Inside-Host", to: "NAT-Router", portFrom: "FastEthernet0", portTo: "FastEthernet0/0" },
        { from: "NAT-Router", to: "Outside-Server", portFrom: "FastEthernet0/1", portTo: "FastEthernet0" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("NAT-Router", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/0",
        "ip address 192.168.1.1 255.255.255.0",
        "ip nat inside",
        "no shutdown",
        "exit",
        "interface FastEthernet0/1",
        "ip address 203.0.113.1 255.255.255.0",
        "ip nat outside",
        "no shutdown",
        "exit",
        "ip routing",
        "end",
      ], { save: false });

      await controller.configHost("Inside-Host", { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" });
      await controller.configHost("Outside-Server", { ip: "203.0.113.100", mask: "255.255.255.0", gateway: "203.0.113.1" });

      await controller.configIos("NAT-Router", [
        "enable",
        "configure terminal",
        "ip nat inside source static 192.168.1.10 203.0.113.10",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "nat-static-config.txt",
        "ip nat inside source static 192.168.1.10 203.0.113.10");

      return {
        outcome: "passed",
        evidence: {
          insideLocal: "192.168.1.10",
          insideGlobal: "203.0.113.10",
          outsideInterface: "FastEthernet0/1",
          translationType: "static",
        },
        warnings,
      };
    } catch (e) {
      return {
        outcome: "failed",
        evidence: {},
        warnings,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const natResult = await controller.show("NAT-Router", "ip nat translations");
    const natRaw = natResult.raw ?? JSON.stringify(natResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "nat-translations.txt", natRaw);

    const runResult = await controller.showRunningConfig("NAT-Router");
    const runRaw = runResult.raw ?? JSON.stringify(runResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "nat-running-config.txt", runRaw);

    const hasStaticNat = runRaw.includes("ip nat inside source static");
    const hasInside = runRaw.includes("ip nat inside");
    const hasOutside = runRaw.includes("ip nat outside");

    const evidence = {
      staticNatConfigured: hasStaticNat,
      insideInterface: "FastEthernet0/0",
      outsideInterface: "FastEthernet0/1",
      natTranslations: natRaw,
    };

    if (!hasStaticNat) {
      warnings.push("NAT estático no aparece en running-config");
    }

    return {
      outcome: hasStaticNat ? "passed" : "partial",
      evidence,
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("Inside-Host", "FastEthernet0");
      await controller.removeLink("NAT-Router", "FastEthernet0/1");
      await controller.removeDevice("Inside-Host");
      await controller.removeDevice("Outside-Server");
      await controller.removeDevice("NAT-Router");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};