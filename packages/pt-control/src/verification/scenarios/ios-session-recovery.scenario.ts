import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const iosSessionRecoveryScenario: RealScenarioDefinition = {
  id: "ios-session-recovery",
  title: "IOS Session Recovery After Invalid Command",
  tags: ["ios", "interactive", "recovery", "resilience"],
  profile: ["interactive-resilience"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 10.0.0.1 255.255.255.0",
      "no shutdown",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1"],
      configuration: "GigabitEthernet0/0 configured",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.ensureTerminalSession("Router1");

      const invalidResult = await controller.execIos("Router1", "invalidcommandthatdoesnotexist");
      const invalidRaw = invalidResult.raw ?? JSON.stringify(invalidResult);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "invalid-command-output.txt", invalidRaw);

      const hasError = invalidRaw.includes("Invalid") || invalidRaw.includes("error") || invalidRaw.includes("^");

      const validResult = await controller.execIos("Router1", "show ip interface brief");
      const validRaw = validResult.raw ?? JSON.stringify(validResult);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "valid-command-output.txt", validRaw);

      const sessionRecovered = validRaw.includes("GigabitEthernet") || validRaw.includes("Interface");

      const verificado = {
        invalidCommandHadError: hasError,
        sessionRecovered,
        invalidOutput: invalidRaw.substring(0, 200),
        validOutputLength: validRaw.length,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "recovery-evidence.json", JSON.stringify(verificado, null, 2));

      if (!sessionRecovered) {
        warnings.push("Sesion puede no haberse recuperado tras comando invalido");
      }

      return {
        outcome: sessionRecovered ? "passed" : "partial",
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

    try {
      const interfaceResult = await controller.showIpInterfaceBrief("Router1");
      const interfaceRaw = interfaceResult.raw ?? JSON.stringify(interfaceResult);

      store.writeStepArtifact(ctx.runId, this.id, "verify", "interface-brief-verify.txt", interfaceRaw);

      const parsed = interfaceResult.parsed ?? interfaceResult;
      const interfaces = parsed.interfaces ?? [];
      const hasGig0_0 = interfaces.some((i: any) =>
        i.interface?.includes("GigabitEthernet0/0") || i.name?.includes("GigabitEthernet0/0")
      );

      const verificado = {
        sessionStillFunctional: interfaceRaw.length > 50,
        interfaceCount: interfaces.length,
        hasGigabit0_0: hasGig0_0,
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "session-verification.json", JSON.stringify(verificado, null, 2));

      const success = verificado.sessionStillFunctional && verificado.hasGigabit0_0;
      return {
        outcome: success ? "passed" : "failed",
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
