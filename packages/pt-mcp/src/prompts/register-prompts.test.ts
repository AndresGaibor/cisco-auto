
import { describe, expect, test } from "bun:test";
import { registerPrompts } from "./register-prompts.js";

describe("registerPrompts", () => {
  function capture() {
    const prompts = new Map<string, { config: any; handler: any }>();

    registerPrompts({
      server: {
        registerPrompt(name: string, config: any, handler: any) {
          prompts.set(name, { config, handler });
        },
      },
    });

    return prompts;
  }

  test("registra prompts esperados", () => {
    const prompts = capture();

    for (const name of [
      "pt.status_triage",
      "pt.safe_show_batch",
      "pt.partial_batch_recovery",
      "pt.device_troubleshoot",
      "pt.topology_audit",
      "pt.before_after_change",
      "pt.config_change_guarded",
      "pt.explain_cmd_result",
    ]) {
      expect(prompts.has(name)).toBe(true);
      expect(prompts.get(name)?.config.title).toBeString();
      expect(prompts.get(name)?.config.description.length).toBeGreaterThan(40);
      expect(prompts.get(name)?.config.argsSchema).toBeDefined();
    }
  });

  test("safe_show_batch genera instrucciones útiles", async () => {
    const prompts = capture();
    const prompt = prompts.get("pt.safe_show_batch");
    expect(prompt).toBeDefined();

    const result = await prompt!.handler({
      device: "MLS-CORE-1",
      commands: ["show clock", "show vlan brief"],
      goal: "validate switching",
    });

    const text = result.messages[0].content.text;
    expect(text).toContain("pt_cmd_run");
    expect(text).toContain("continueOnError: true");
    expect(text).toContain("optimized-runtime-multistep");
    expect(text).toContain("optimized-runtime-partial-plus-sequential");
    expect(text).toContain("MLS-CORE-1");
  });
});
