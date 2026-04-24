import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario STP Root Bridge Control - 3 switches con prioridad forzada
 *
 * Topología:
 *   Switch1 --- Switch2 --- Switch3
 *      |
 *      +---- Switch3 (enlace redundante)
 *
 * Verifica:
 * 1. Configurar prioridad STP para forzar root bridge específico
 * 2. Verificar con show spanning-tree que Switch1 es root
 * 3. Verificar estado de puertos (designated, root, blocking)
 */
export const stpRootControlScenario: RealScenarioDefinition = {
  id: "stp-root-control",
  title: "STP Root Bridge Control - Priority Configuration",
  tags: ["stp", "root-bridge", "switching"],
  profile: ["switching-resilience"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("Switch2", "2960-24TT");
    await controller.addDevice("Switch3", "2960-24TT");

    await controller.addLink("Switch1", "FastEthernet0/1", "Switch2", "FastEthernet0/1");
    await controller.addLink("Switch2", "FastEthernet0/2", "Switch3", "FastEthernet0/1");
    await controller.addLink("Switch3", "FastEthernet0/2", "Switch1", "FastEthernet0/2");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "Switch2", "Switch3"],
      links: [
        { from: "Switch1", to: "Switch2", portFrom: "FastEthernet0/1", portTo: "FastEthernet0/1" },
        { from: "Switch2", to: "Switch3", portFrom: "FastEthernet0/2", portTo: "FastEthernet0/1" },
        { from: "Switch3", to: "Switch1", portFrom: "FastEthernet0/2", portTo: "FastEthernet0/2" },
      ],
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
        "spanning-tree mode pvst",
        "spanning-tree vlan 1 priority 4096",
        "end",
      ], { save: false });

      await controller.configIos("Switch2", [
        "enable",
        "configure terminal",
        "spanning-tree mode pvst",
        "end",
      ], { save: false });

      await controller.configIos("Switch3", [
        "enable",
        "configure terminal",
        "spanning-tree mode pvst",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "root-config.txt",
        "Switch1: spanning-tree vlan 1 priority 4096 (root)\nSwitch2: default priority\nSwitch3: default priority");

      return {
        outcome: "passed",
        evidence: { rootSwitch: "Switch1", priority: 4096 },
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

      const switch1IsRoot = stpRaw1.includes("This bridge is the root") || stpRaw1.includes("Root ID");
      const switch2NotRoot = !stpRaw2.includes("This bridge is the root");
      const switch3NotRoot = !stpRaw3.includes("This bridge is the root");

      const hasDesignated = stpRaw2.includes("Designated") || stpRaw3.includes("Designated");
      const hasRoot = stpRaw2.includes("Root") || stpRaw3.includes("Root");
      const hasBlocking = stpRaw2.includes("Blocking") || stpRaw3.includes("Blocking") ||
                         stpRaw2.includes("BLK") || stpRaw3.includes("BLK");

      const evidence = {
        stpSwitch1Raw: stpRaw1,
        stpSwitch2Raw: stpRaw2,
        stpSwitch3Raw: stpRaw3,
        switch1IsRoot,
        switch2NotRoot,
        switch3NotRoot,
        hasDesignatedPort: hasDesignated,
        hasRootPort: hasRoot,
        hasBlockingPort: hasBlocking,
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "root-verification.json", JSON.stringify(evidence, null, 2));

      const verified = switch1IsRoot && switch2NotRoot && switch3NotRoot;
      if (!switch1IsRoot) {
        warnings.push("Switch1 no es root bridge - prioridad puede no haberse aplicado");
      }
      if (!hasBlocking && !hasDesignated) {
        warnings.push("No se detectaron puertos designated o blocking - topología puede estar en estado inesperado");
      }

      return {
        outcome: verified ? "passed" : "failed",
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
      await controller.removeLink("Switch1", "FastEthernet0/1");
      await controller.removeLink("Switch2", "FastEthernet0/2");
      await controller.removeLink("Switch3", "FastEthernet0/2");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Switch2");
      await controller.removeDevice("Switch3");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};