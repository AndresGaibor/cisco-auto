import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const routerOnStickNegativeScenario: RealScenarioDefinition = {
  id: "router-on-stick-negative",
  title: "Router-on-a-Stick Broken Configuration Diagnosis",
  tags: ["router-on-stick", "diagnosis", "broken-scenario"],
  profile: ["routing-intervlan"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");
    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("Switch1", "FastEthernet0/1", "Router1", "GigabitEthernet0/0");
    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/2");
    await controller.addLink("PC2", "FastEthernet0", "Switch1", "FastEthernet0/3");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "Switch1", "PC1", "PC2"],
      topology: "router-on-stick",
      intentionalIssue: "subinterfaces without encapsulation dot1Q",
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
        "vlan 10",
        "name VLAN10",
        "exit",
        "vlan 20",
        "name VLAN20",
        "exit",
        "interface FastEthernet0/2",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/3",
        "switchport mode access",
        "switchport access vlan 20",
        "exit",
        "interface FastEthernet0/1",
        "switchport mode trunk",
        "switchport trunk allowed vlan 10,20",
        "end",
      ], { save: false });

      await controller.configIos("Router1", [
        "enable",
        "configure terminal",
        "interface GigabitEthernet0/0",
        "no shutdown",
        "exit",
        "interface GigabitEthernet0/0.10",
        "ip address 192.168.10.1 255.255.255.0",
        "exit",
        "interface GigabitEthernet0/0.20",
        "ip address 192.168.20.1 255.255.255.0",
        "end",
      ], { save: false });

      await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0", gateway: "192.168.10.1" });
      await controller.configHost("PC2", { ip: "192.168.20.10", mask: "255.255.255.0", gateway: "192.168.20.1" });

      const interfaceResult = await controller.showIpInterfaceBrief("Router1");
      const interfaceRaw = interfaceResult.raw ?? JSON.stringify(interfaceResult);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ip-interface-brief-broken.txt", interfaceRaw);

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.20.10",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-inter-vlan-broken.txt", pingOutput);

      const pingFailed = pingOutput.includes("100%") || pingOutput.includes("fail");

      const verificado = {
        interfaceOutput: interfaceRaw,
        pingOutput: pingOutput,
        pingFailed: pingFailed,
        issueDetected: pingFailed,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "diagnosis-evidence.json", JSON.stringify(verificado, null, 2));

      if (pingFailed) {
        warnings.push("Fallo deliberado detectado - inter-VLAN no funciona por falta de encapsulation dot1Q");
      }

      return {
        outcome: pingFailed ? "passed" : "partial",
        evidence: verificado,
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

    const runningConfig = await controller.showRunningConfig("Router1");
    const configRaw = runningConfig.raw ?? JSON.stringify(runningConfig);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "running-config.txt", configRaw);

    const hasEncapsulation = configRaw.includes("encapsulation dot1Q");

    const verificado = {
      hasEncapsulationDot1Q: hasEncapsulation,
      issueExpected: !hasEncapsulation,
      rawConfigLength: configRaw.length,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "config-verification.json", JSON.stringify(verificado, null, 2));

    const diagnosisCorrect = !hasEncapsulation;
    return {
      outcome: diagnosisCorrect ? "passed" : "failed",
      evidence: verificado,
      warnings: diagnosisCorrect ? warnings : [...warnings, "Configuracion parece correcta - diagnostico puede no ser valido"],
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("PC2", "FastEthernet0");
      await controller.removeLink("Switch1", "FastEthernet0/1");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
