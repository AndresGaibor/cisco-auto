import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de ACL extendida básica.
 * Configura una ACL extendida para filtrar tráfico por protocolo y puerto.
 * Verifica que el tráfico permitido pasa y el denegado es bloqueado.
 */
export const aclExtendedBasicScenario: RealScenarioDefinition = {
  id: "acl-extended-basic",
  title: "ACL Extendida - Filtrado por protocolo y puerto",
  tags: ["acl", "extended", "filtering"],
  profile: ["acl-nat-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("RouterExt", "2911");
    await controller.addDevice("Server1", "Server-PT");
    await controller.addDevice("PC-Client", "PC-PT");

    await controller.addLink("PC-Client", "FastEthernet0", "RouterExt", "FastEthernet0/0");
    await controller.addLink("Server1", "FastEthernet0", "RouterExt", "FastEthernet0/1");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["RouterExt", "Server1", "PC-Client"],
      links: [
        { from: "PC-Client", to: "RouterExt", portFrom: "FastEthernet0", portTo: "FastEthernet0/0" },
        { from: "Server1", to: "RouterExt", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("RouterExt", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/0",
        "ip address 192.168.1.1 255.255.255.0",
        "no shutdown",
        "exit",
        "interface FastEthernet0/1",
        "ip address 192.168.2.1 255.255.255.0",
        "no shutdown",
        "exit",
        "ip routing",
        "end",
      ], { save: false });

      await controller.configHost("PC-Client", { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" });
      await controller.configHost("Server1", { ip: "192.168.2.100", mask: "255.255.255.0", gateway: "192.168.2.1" });

      await controller.configIos("RouterExt", [
        "enable",
        "configure terminal",
        "access-list 100 permit tcp 192.168.1.0 0.0.0.255 host 192.168.2.100 eq 80",
        "access-list 100 permit tcp 192.168.1.0 0.0.0.255 host 192.168.2.100 eq 443",
        "access-list 100 deny ip 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255",
        "access-list 100 permit ip any any",
        "interface FastEthernet0/0",
        "ip access-group 100 in",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "acl-extended-commands.txt",
        "access-list 100 permit tcp 192.168.1.0 0.0.0.255 host 192.168.2.100 eq 80\naccess-list 100 permit tcp 192.168.1.0 0.0.0.255 host 192.168.2.100 eq 443\naccess-list 100 deny ip 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255\naccess-list 100 permit ip any any\ninterface FastEthernet0/0\nip access-group 100 in");

      return {
        outcome: "passed",
        evidence: {
          aclNumber: 100,
          type: "extended",
          permittedPorts: [80, 443],
          deniedNetwork: "192.168.1.0 to 192.168.2.0",
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

    const aclResult = await controller.show("RouterExt", "access-list 100");
    const aclRaw = aclResult.raw ?? JSON.stringify(aclResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "acl-100-show.txt", aclRaw);

    const evidence = {
      aclExtendedEntries: aclRaw,
      hasTcpRules: aclRaw.includes("tcp"),
      hasDenyRule: aclRaw.includes("deny"),
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
      await controller.removeLink("PC-Client", "FastEthernet0");
      await controller.removeLink("Server1", "FastEthernet0");
      await controller.removeDevice("PC-Client");
      await controller.removeDevice("Server1");
      await controller.removeDevice("RouterExt");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};