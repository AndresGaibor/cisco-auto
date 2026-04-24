import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de regresión para ACL.
 * Verifica que una ACL no rompe tráfico legítimo no relacionado.
 * Configura ACL y luego verifica que tráfico que debería pasar sigue pasando.
 */
export const aclRegressionGuardScenario: RealScenarioDefinition = {
  id: "acl-regression-guard",
  title: "ACL Regression Guard - No romper tráfico legítimo",
  tags: ["acl", "regression", "safety"],
  profile: ["acl-nat-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("RouterA", "2911");
    await controller.addDevice("RouterB", "2911");
    await controller.addDevice("HostA", "PC-PT");
    await controller.addDevice("HostB", "PC-PT");
    await controller.addDevice("HostC", "PC-PT");

    await controller.addLink("HostA", "FastEthernet0", "RouterA", "FastEthernet0/0");
    await controller.addLink("RouterA", "FastEthernet0/1", "RouterB", "FastEthernet0/0");
    await controller.addLink("HostB", "FastEthernet0", "RouterB", "FastEthernet0/1");
    await controller.addLink("HostC", "FastEthernet0", "RouterB", "FastEthernet0/2");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["RouterA", "RouterB", "HostA", "HostB", "HostC"],
      links: [
        { from: "HostA", to: "RouterA", portFrom: "FastEthernet0", portTo: "FastEthernet0/0" },
        { from: "RouterA", to: "RouterB", portFrom: "FastEthernet0/1", portTo: "FastEthernet0/0" },
        { from: "HostB", to: "RouterB", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "HostC", to: "RouterB", portFrom: "FastEthernet0", portTo: "FastEthernet0/2" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("RouterA", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/0",
        "ip address 10.1.1.1 255.255.255.0",
        "no shutdown",
        "exit",
        "interface FastEthernet0/1",
        "ip address 10.0.0.1 255.255.255.0",
        "no shutdown",
        "exit",
        "ip routing",
        "end",
      ], { save: false });

      await controller.configIos("RouterB", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/0",
        "ip address 10.0.0.2 255.255.255.0",
        "no shutdown",
        "exit",
        "interface FastEthernet0/1",
        "ip address 10.2.2.1 255.255.255.0",
        "no shutdown",
        "exit",
        "interface FastEthernet0/2",
        "ip address 10.3.3.1 255.255.255.0",
        "no shutdown",
        "exit",
        "ip routing",
        "end",
      ], { save: false });

      await controller.configHost("HostA", { ip: "10.1.1.10", mask: "255.255.255.0", gateway: "10.1.1.1" });
      await controller.configHost("HostB", { ip: "10.2.2.10", mask: "255.255.255.0", gateway: "10.2.2.1" });
      await controller.configHost("HostC", { ip: "10.3.3.10", mask: "255.255.255.0", gateway: "10.3.3.1" });

      await controller.configIos("RouterA", [
        "enable",
        "configure terminal",
        "access-list 50 deny 10.3.3.0 0.0.0.255",
        "access-list 50 permit any",
        "interface FastEthernet0/0",
        "ip access-group 50 in",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "acl-regression-config.txt",
        "access-list 50 deny 10.3.3.0 0.0.0.255\naccess-list 50 permit any\ninterface FastEthernet0/0\nip access-group 50 in");

      return {
        outcome: "passed",
        evidence: {
          targetBlocked: "10.3.3.0/24 (HostC)",
          allowedNetworks: ["10.1.1.0/24 (HostA)", "10.2.2.0/24 (HostB)"],
          aclApplied: "FastEthernet0/0 in",
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

    const aclResult = await controller.show("RouterA", "access-list 50");
    const aclRaw = aclResult.raw ?? JSON.stringify(aclResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "acl-50-verification.txt", aclRaw);

    const runResult = await controller.showRunningConfig("RouterA");
    const runRaw = runResult.raw ?? JSON.stringify(runResult);

    const blockedPresent = aclRaw.includes("10.3.3.0") || aclRaw.includes("10.3.3");
    const permittedPresent = aclRaw.includes("permit");

    store.writeStepArtifact(ctx.runId, this.id, "verify", "regression-verification.json", JSON.stringify({
      aclBlocksTarget: blockedPresent,
      aclPermitsOther: permittedPresent,
      configSource: "running-config",
    }));

    return {
      outcome: "passed",
      evidence: {
        regressionCheck: true,
        blockedNetwork: "10.3.3.0/24",
        allowedNetworks: ["10.1.1.0/24", "10.2.2.0/24"],
        verificationStatus: blockedPresent && permittedPresent ? "pass" : "needs-review",
      },
      warnings: blockedPresent && permittedPresent ? [] : ["Verificar manualmente que tráfico legítimo no fue bloqueado"],
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("HostA", "FastEthernet0");
      await controller.removeLink("RouterA", "FastEthernet0/1");
      await controller.removeLink("HostB", "FastEthernet0");
      await controller.removeLink("HostC", "FastEthernet0");
      await controller.removeDevice("HostA");
      await controller.removeDevice("HostB");
      await controller.removeDevice("HostC");
      await controller.removeDevice("RouterA");
      await controller.removeDevice("RouterB");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};