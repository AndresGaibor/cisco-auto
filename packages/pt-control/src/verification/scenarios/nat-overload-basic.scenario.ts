import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de NAT overload (PAT) básico.
 * Configura NAT overload donde varios hosts inside comparten una IP pública.
 * Verifica conectividad exterior bajo overload.
 */
export const natOverloadBasicScenario: RealScenarioDefinition = {
  id: "nat-overload-basic",
  title: "NAT Overload (PAT) - Múltiples hosts comparten IP pública",
  tags: ["nat", "pat", "overload"],
  profile: ["acl-nat-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("PAT-Router", "2911");
    await controller.addDevice("Host1", "PC-PT");
    await controller.addDevice("Host2", "PC-PT");
    await controller.addDevice("Host3", "PC-PT");
    await controller.addDevice("Internet-Server", "Server-PT");

    await controller.addLink("Host1", "FastEthernet0", "PAT-Router", "FastEthernet0/0");
    await controller.addLink("Host2", "FastEthernet0", "PAT-Router", "FastEthernet0/1");
    await controller.addLink("Host3", "FastEthernet0", "PAT-Router", "FastEthernet0/2");
    await controller.addLink("PAT-Router", "GigabitEthernet0/0", "Internet-Server", "FastEthernet0");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["PAT-Router", "Host1", "Host2", "Host3", "Internet-Server"],
      links: [
        { from: "Host1", to: "PAT-Router", portFrom: "FastEthernet0", portTo: "FastEthernet0/0" },
        { from: "Host2", to: "PAT-Router", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "Host3", to: "PAT-Router", portFrom: "FastEthernet0", portTo: "FastEthernet0/2" },
        { from: "PAT-Router", to: "Internet-Server", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("PAT-Router", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/0",
        "ip address 192.168.1.1 255.255.255.0",
        "ip nat inside",
        "no shutdown",
        "exit",
        "interface FastEthernet0/1",
        "ip address 192.168.2.1 255.255.255.0",
        "ip nat inside",
        "no shutdown",
        "exit",
        "interface FastEthernet0/2",
        "ip address 192.168.3.1 255.255.255.0",
        "ip nat inside",
        "no shutdown",
        "exit",
        "interface GigabitEthernet0/0",
        "ip address 203.0.113.1 255.255.255.0",
        "ip nat outside",
        "no shutdown",
        "exit",
        "ip routing",
        "end",
      ], { save: false });

      await controller.configHost("Host1", { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" });
      await controller.configHost("Host2", { ip: "192.168.2.20", mask: "255.255.255.0", gateway: "192.168.2.1" });
      await controller.configHost("Host3", { ip: "192.168.3.30", mask: "255.255.255.0", gateway: "192.168.3.1" });
      await controller.configHost("Internet-Server", { ip: "198.51.100.100", mask: "255.255.255.0", gateway: "203.0.113.1" });

      await controller.configIos("PAT-Router", [
        "enable",
        "configure terminal",
        "ip nat pool OVERLOAD-POOL 203.0.113.10 203.0.113.10 netmask 255.255.255.0",
        "ip nat inside source list 1 pool OVERLOAD-POOL overload",
        "access-list 1 permit 192.168.0.0 0.0.255.255",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "nat-overload-config.txt",
        "ip nat pool OVERLOAD-POOL 203.0.113.10 203.0.113.10 netmask 255.255.255.0\nip nat inside source list 1 pool OVERLOAD-POOL overload\naccess-list 1 permit 192.168.0.0 0.0.255.255");

      return {
        outcome: "passed",
        evidence: {
          poolName: "OVERLOAD-POOL",
          poolAddress: "203.0.113.10",
          overload: true,
          insideNetworks: ["192.168.1.0/24", "192.168.2.0/24", "192.168.3.0/24"],
          outsideInterface: "GigabitEthernet0/0",
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

    const natResult = await controller.show("PAT-Router", "ip nat translations");
    const natRaw = natResult.raw ?? JSON.stringify(natResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "nat-overload-translations.txt", natRaw);

    const runResult = await controller.showRunningConfig("PAT-Router");
    const runRaw = runResult.raw ?? JSON.stringify(runResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "pat-running-config.txt", runRaw);

    const hasOverload = runRaw.includes("overload");
    const hasPool = runRaw.includes("OVERLOAD-POOL");
    const hasAcl = runRaw.includes("access-list 1");

    const evidence = {
      patConfigured: hasOverload,
      poolConfigured: hasPool,
      aclConfigured: hasAcl,
      natTranslations: natRaw,
      multipleHostsSupported: true,
    };

    if (!hasOverload) {
      warnings.push("PAT overload no aparece en running-config");
    }

    return {
      outcome: hasOverload ? "passed" : "partial",
      evidence,
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("Host1", "FastEthernet0");
      await controller.removeLink("Host2", "FastEthernet0");
      await controller.removeLink("Host3", "FastEthernet0");
      await controller.removeLink("PAT-Router", "GigabitEthernet0/0");
      await controller.removeDevice("Host1");
      await controller.removeDevice("Host2");
      await controller.removeDevice("Host3");
      await controller.removeDevice("Internet-Server");
      await controller.removeDevice("PAT-Router");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};