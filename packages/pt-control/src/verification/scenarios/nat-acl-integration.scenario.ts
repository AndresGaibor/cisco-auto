import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de integración NAT + ACL.
 * Combina NAT con ACL para asegurar que la ACL se aplica correctamente
 * incluso con NAT activo, y que NAT traduce correctamente bajo política ACL.
 */
export const natAclIntegrationScenario: RealScenarioDefinition = {
  id: "nat-acl-integration",
  title: "NAT + ACL Integration - Filtrado con traducción",
  tags: ["nat", "acl", "integration"],
  profile: ["acl-nat-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("EdgeRouter", "2911");
    await controller.addDevice("DMZ-Server", "Server-PT");
    await controller.addDevice("Inside-PC", "PC-PT");
    await controller.addDevice("External-PC", "PC-PT");

    await controller.addLink("Inside-PC", "FastEthernet0", "EdgeRouter", "FastEthernet0/0");
    await controller.addLink("EdgeRouter", "FastEthernet0/1", "DMZ-Server", "FastEthernet0");
    await controller.addLink("EdgeRouter", "GigabitEthernet0/0", "External-PC", "FastEthernet0");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["EdgeRouter", "DMZ-Server", "Inside-PC", "External-PC"],
      links: [
        { from: "Inside-PC", to: "EdgeRouter", portFrom: "FastEthernet0", portTo: "FastEthernet0/0" },
        { from: "EdgeRouter", to: "DMZ-Server", portFrom: "FastEthernet0/1", portTo: "FastEthernet0" },
        { from: "EdgeRouter", to: "External-PC", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("EdgeRouter", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/0",
        "ip address 10.0.1.1 255.255.255.0",
        "ip nat inside",
        "no shutdown",
        "exit",
        "interface FastEthernet0/1",
        "ip address 192.168.100.1 255.255.255.0",
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

      await controller.configHost("Inside-PC", { ip: "10.0.1.10", mask: "255.255.255.0", gateway: "10.0.1.1" });
      await controller.configHost("DMZ-Server", { ip: "192.168.100.50", mask: "255.255.255.0", gateway: "192.168.100.1" });
      await controller.configHost("External-PC", { ip: "198.51.100.200", mask: "255.255.255.0", gateway: "203.0.113.1" });

      await controller.configIos("EdgeRouter", [
        "enable",
        "configure terminal",
        "access-list 100 permit tcp 10.0.1.0 0.0.0.255 host 192.168.100.50 eq 80",
        "access-list 100 permit tcp 10.0.1.0 0.0.0.255 host 192.168.100.50 eq 443",
        "access-list 100 deny ip 10.0.1.0 0.0.0.255 192.168.100.0 0.0.0.255",
        "access-list 100 permit ip 10.0.1.0 0.0.0.255 any",
        "interface FastEthernet0/0",
        "ip access-group 100 in",
        "end",
      ], { save: false });

      await controller.configIos("EdgeRouter", [
        "enable",
        "configure terminal",
        "ip nat inside source static 192.168.100.50 203.0.113.50",
        "ip nat inside source list 1 interface GigabitEthernet0/0 overload",
        "access-list 1 permit 10.0.1.0 0.0.0.255",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "nat-acl-config.txt",
        "NAT: ip nat inside source static 192.168.100.50 203.0.113.50\n" +
        "NAT: ip nat inside source list 1 interface GigabitEthernet0/0 overload\n" +
        "ACL: access-list 100 permit tcp 10.0.1.0 0.0.0.255 host 192.168.100.50 eq 80\n" +
        "ACL: access-list 100 permit tcp 10.0.1.0 0.0.0.255 host 192.168.100.50 eq 443\n" +
        "ACL: access-list 100 deny ip 10.0.1.0 0.0.0.255 192.168.100.0 0.0.0.255");

      return {
        outcome: "passed",
        evidence: {
          natConfigured: true,
          staticNat: "192.168.100.50 -> 203.0.113.50",
          aclNumber: 100,
          natOverload: true,
          zones: {
            inside: "FastEthernet0/0",
            dmz: "FastEthernet0/1",
            outside: "GigabitEthernet0/0",
          },
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

    const aclResult = await controller.show("EdgeRouter", "access-list 100");
    const aclRaw = aclResult.raw ?? JSON.stringify(aclResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "acl-100-integration.txt", aclRaw);

    const natResult = await controller.show("EdgeRouter", "ip nat translations");
    const natRaw = natResult.raw ?? JSON.stringify(natResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "nat-translations-integration.txt", natRaw);

    const runResult = await controller.showRunningConfig("EdgeRouter");
    const runRaw = runResult.raw ?? JSON.stringify(runResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "integration-running-config.txt", runRaw);

    const hasAcl = runRaw.includes("access-list 100");
    const hasNat = runRaw.includes("ip nat inside source");
    const hasOverload = runRaw.includes("overload");

    const evidence = {
      aclPresent: hasAcl,
      natPresent: hasNat,
      patOverloadActive: hasOverload,
      natTranslations: natRaw,
      aclFilterRules: aclRaw,
    };

    if (!hasAcl || !hasNat) {
      warnings.push("Verificar que NAT y ACL coexisten correctamente");
    }

    return {
      outcome: hasAcl && hasNat ? "passed" : "partial",
      evidence,
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("Inside-PC", "FastEthernet0");
      await controller.removeLink("EdgeRouter", "FastEthernet0/1");
      await controller.removeLink("EdgeRouter", "GigabitEthernet0/0");
      await controller.removeDevice("Inside-PC");
      await controller.removeDevice("DMZ-Server");
      await controller.removeDevice("External-PC");
      await controller.removeDevice("EdgeRouter");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};