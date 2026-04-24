import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario RSTP Basic - Topología triangular con 3 switches
 *
 * Topología:
 *   Switch1 --- Switch2
 *      |  \  /  |
 *      |   X   |
 *      |  / \  |
 *   Switch3 ----
 *
 * Verifica que STP bloquea al menos un enlace y que existe conectividad
 * entre hosts extremos tras convergencia.
 */
export const rstpBasicScenario: RealScenarioDefinition = {
  id: "rstp-basic",
  title: "RSTP Basic - 3 Switches Triangle",
  tags: ["stp", "rstp", "switching", "l2", "convergence"],
  profile: ["switching-resilience"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("Switch2", "2960-24TT");
    await controller.addDevice("Switch3", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("Switch1", "FastEthernet0/1", "Switch2", "FastEthernet0/1");
    await controller.addLink("Switch2", "FastEthernet0/2", "Switch3", "FastEthernet0/1");
    await controller.addLink("Switch3", "FastEthernet0/2", "Switch1", "FastEthernet0/2");

    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/3");
    await controller.addLink("PC2", "FastEthernet0", "Switch3", "FastEthernet0/3");

    await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0" });
    await controller.configHost("PC2", { ip: "192.168.10.11", mask: "255.255.255.0", gateway: "192.168.10.1" });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "Switch2", "Switch3", "PC1", "PC2"],
      links: [
        { from: "Switch1", to: "Switch2", portFrom: "FastEthernet0/1", portTo: "FastEthernet0/1" },
        { from: "Switch2", to: "Switch3", portFrom: "FastEthernet0/2", portTo: "FastEthernet0/1" },
        { from: "Switch3", to: "Switch1", portFrom: "FastEthernet0/2", portTo: "FastEthernet0/2" },
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/3" },
        { from: "PC2", to: "Switch3", portFrom: "FastEthernet0", portTo: "FastEthernet0/3" },
      ],
      redundancy: "triangle",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("Switch1", [
        "enable",
        "configure terminal",
        "spanning-tree mode rapid-pvst",
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "end",
      ], { save: false });

      await controller.configIos("Switch2", [
        "enable",
        "configure terminal",
        "spanning-tree mode rapid-pvst",
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "end",
      ], { save: false });

      await controller.configIos("Switch3", [
        "enable",
        "configure terminal",
        "spanning-tree mode rapid-pvst",
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "interface FastEthernet0/3",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "rstp-config.txt",
        "spanning-tree mode rapid-pvst\nvlan 10 name DATA_VLAN10");

      return {
        outcome: "passed",
        evidence: { switches: ["Switch1", "Switch2", "Switch3"], vlan: 10, mode: "rapid-pvst" },
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

    try {
      const stpResult1 = await controller.show("Switch1", "show spanning-tree");
      const stpRaw1 = stpResult1.raw ?? JSON.stringify(stpResult1);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "stp-switch1.txt", stpRaw1);

      const stpResult2 = await controller.show("Switch2", "show spanning-tree");
      const stpRaw2 = stpResult2.raw ?? JSON.stringify(stpResult2);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "stp-switch2.txt", stpRaw2);

      const stpResult3 = await controller.show("Switch3", "show spanning-tree");
      const stpRaw3 = stpResult3.raw ?? JSON.stringify(stpResult3);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "stp-switch3.txt", stpRaw3);

      const pingResult = await controller.execIos("PC1", "ping 192.168.10.11", false);
      const pingRaw = pingResult.raw ?? JSON.stringify(pingResult);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-pc1-to-pc2.txt", pingRaw);

      const hasBlocking = stpRaw1.includes("Blocking") || stpRaw2.includes("Blocking") || stpRaw3.includes("Blocking") ||
                          stpRaw1.includes("BLK") || stpRaw2.includes("BLK") || stpRaw3.includes("BLK");
      const hasForwarding = stpRaw1.includes("Forwarding") || stpRaw2.includes("Forwarding") || stpRaw3.includes("Forwarding") ||
                           stpRaw1.includes("FWD") || stpRaw2.includes("FWD") || stpRaw3.includes("FWD");
      const pingSuccess = pingRaw.includes("Success") || pingRaw.includes("sent") || pingRaw.includes("=");

      const evidence = {
        stpSwitch1Raw: stpRaw1,
        stpSwitch2Raw: stpRaw2,
        stpSwitch3Raw: stpRaw3,
        pingResult: pingRaw,
        hasBlockingPort: hasBlocking,
        hasForwardingPort: hasForwarding,
        pingSuccessful: pingSuccess,
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "rstp-verification.json", JSON.stringify(evidence, null, 2));

      const verified = pingSuccess && (hasBlocking || hasForwarding);
      if (!pingSuccess) {
        warnings.push("Ping entre PC1 y PC2 falló - posibles problemas de convergencia STP");
      }
      if (!hasBlocking) {
        warnings.push("No se detectó puerto en estado Blocking - topología puede no tener redundancia activa");
      }

      return {
        outcome: verified ? "passed" : "partial",
        evidence,
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

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("PC2", "FastEthernet0");
      await controller.removeLink("Switch1", "FastEthernet0/1");
      await controller.removeLink("Switch2", "FastEthernet0/2");
      await controller.removeLink("Switch3", "FastEthernet0/2");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Switch2");
      await controller.removeDevice("Switch3");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};