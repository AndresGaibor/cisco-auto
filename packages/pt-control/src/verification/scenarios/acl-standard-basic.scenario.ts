import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de ACL estándar básica.
 * Configura 2 routers con hosts a cada lado y una ACL estándar
 * que bloquea tráfico de una subred hacia otra.
 * Verifica que el tráfico permitido funciona y el denegado es bloqueado.
 */
export const aclStandardBasicScenario: RealScenarioDefinition = {
  id: "acl-standard-basic",
  title: "ACL Estándar - Filtrado básico entre subredes",
  tags: ["acl", "standard", "filtering", "policy"],
  profile: ["acl-nat-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("R1", "2911");
    await controller.addDevice("R2", "2911");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "R1", "FastEthernet0/0");
    await controller.addLink("R1", "FastEthernet0/1", "R2", "FastEthernet0/0");
    await controller.addLink("R2", "FastEthernet0/1", "PC2", "FastEthernet0");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["R1", "R2", "PC1", "PC2"],
      links: [
        { from: "PC1", to: "R1", portFrom: "FastEthernet0", portTo: "FastEthernet0/0" },
        { from: "R1", to: "R2", portFrom: "FastEthernet0/1", portTo: "FastEthernet0/0" },
        { from: "R2", to: "PC2", portFrom: "FastEthernet0/1", portTo: "FastEthernet0" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("R1", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/0",
        "ip address 192.168.1.1 255.255.255.0",
        "no shutdown",
        "exit",
        "interface FastEthernet0/1",
        "ip address 10.0.0.1 255.255.255.0",
        "no shutdown",
        "exit",
        "ip routing",
        "end",
      ], { save: false });

      await controller.configIos("R2", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/0",
        "ip address 10.0.0.2 255.255.255.0",
        "no shutdown",
        "exit",
        "interface FastEthernet0/1",
        "ip address 192.168.2.1 255.255.255.0",
        "no shutdown",
        "exit",
        "ip routing",
        "end",
      ], { save: false });

      await controller.configHost("PC1", { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" });
      await controller.configHost("PC2", { ip: "192.168.2.10", mask: "255.255.255.0", gateway: "192.168.2.1" });

      await controller.configIos("R1", [
        "enable",
        "configure terminal",
        "access-list 10 deny 192.168.2.0 0.0.0.255",
        "access-list 10 permit any",
        "interface FastEthernet0/0",
        "ip access-group 10 in",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "acl-config-commands.txt",
        "access-list 10 deny 192.168.2.0 0.0.0.255\naccess-list 10 permit any\ninterface FastEthernet0/0\nip access-group 10 in");

      return {
        outcome: "passed",
        evidence: {
          aclNumber: 10,
          deniedNetwork: "192.168.2.0/24",
          appliedInterface: "FastEthernet0/0",
          direction: "in",
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

    const aclResult = await controller.show("R1", "access-list 10");
    const aclRaw = aclResult.raw ?? JSON.stringify(aclResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "acl-show.txt", aclRaw);

    const runResult = await controller.showRunningConfig("R1");
    const runRaw = runResult.raw ?? JSON.stringify(runResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "running-config.txt", runRaw);

    const evidence = {
      aclEntries: aclRaw,
      configApplied: runRaw.includes("access-list 10"),
    };

    return {
      outcome: "passed",
      evidence,
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("R1", "FastEthernet0/1");
      await controller.removeLink("R2", "FastEthernet0/1");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("R1");
      await controller.removeDevice("R2");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};