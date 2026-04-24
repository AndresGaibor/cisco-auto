import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const iosShowCommandsScenario: RealScenarioDefinition = {
  id: "ios-show-commands",
  title: "IOS Show Commands Output Verification",
  tags: ["ios", "terminal", "show", "smoke"],
  profile: ["ios-core", "smoke"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await buildBasicRouter(controller, "Router1", { skipBoot: true });
    await controller.configIos("Router1", [
      "interface GigabitEthernet0/0",
      "ip address 10.0.0.1 255.255.255.0",
      "no shutdown",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1"],
      configuration: "ip addresses configured on GigabitEthernet0/0 and GigabitEthernet0/1",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.ensureTerminalSession("Router1");

      const [versionResult, interfaceResult] = await Promise.all([
        controller.execIos("Router1", "show version"),
        controller.showIpInterfaceBrief("Router1"),
      ]);

      const versionRaw = versionResult.raw ?? JSON.stringify(versionResult);
      const interfaceRaw = interfaceResult.raw ?? JSON.stringify(interfaceResult);

      store.writeStepArtifact(ctx.runId, this.id, "execute", "show-version.txt", versionRaw);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "show-ip-int-brief.txt", interfaceRaw);

      const versionParsed = versionResult.parsed ?? versionResult;
      const interfaceParsed = interfaceResult.parsed ?? interfaceResult;
      const interfaces = interfaceParsed.interfaces ?? [];

      const evidence = {
        versionOutput: versionRaw,
        interfaceOutput: interfaceRaw,
        interfaceCount: interfaces.length,
        hasVersion: versionRaw.length > 0,
        hasInterfaces: interfaces.length > 0,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "execute-evidence.json", JSON.stringify(evidence, null, 2));

      const consistent = evidence.hasVersion && evidence.hasInterfaces && interfaces.length >= 1;

      return {
        outcome: consistent ? "passed" : "partial",
        evidence,
        warnings: consistent ? warnings : [...warnings, "Output puede no ser consistente"],
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

    const interfaceResult = await controller.showIpInterfaceBrief("Router1");
    const interfaceRaw = interfaceResult.raw ?? JSON.stringify(interfaceResult);
    const interfaceParsed = interfaceResult.parsed ?? interfaceResult;
    const interfaces = interfaceParsed.interfaces ?? [];

    const hasGig0_0 = interfaces.some((i: any) =>
      i.interface?.includes("GigabitEthernet0/0") || i.name?.includes("GigabitEthernet0/0")
    );
    const hasGig0_1 = interfaces.some((i: any) =>
      i.interface?.includes("GigabitEthernet0/1") || i.name?.includes("GigabitEthernet0/1")
    );

    const verificado = {
      interfaceCount: interfaces.length,
      hasGigabit0_0: hasGig0_0,
      hasGigabit0_1: hasGig0_1,
      rawOutput: interfaceRaw,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "interface-verification.json", JSON.stringify(verificado, null, 2));

      return {
        outcome: hasGig0_0 ? "passed" : "failed",
        evidence: verificado,
        warnings,
      };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Device removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
