
import * as z from "zod/v4";

export interface RegisterPromptContext {
  server: {
    registerPrompt: (...args: any[]) => void;
  };
}

function textPrompt(text: string) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text,
        },
      },
    ],
  };
}

function lines(items: Array<string | false | null | undefined>): string {
  return items.filter(Boolean).join("\n");
}

export function registerPrompts(ctx: RegisterPromptContext): void {
  ctx.server.registerPrompt(
    "pt.status_triage",
    {
      title: "PT Status Triage",
      description: "Guides an agent through the safest first checks before using Packet Tracer command or topology tools.",
      argsSchema: {
        goal: z.string().optional().describe("What the user is trying to do, if known."),
      },
    },
    async ({ goal }: { goal?: string } = {}) =>
      textPrompt(lines([
        "You are using the Packet Tracer Control MCP.",
        goal ? `User goal: ${goal}` : null,
        "",
        "First call pt_status with op=summary.",
        "Interpret reconciled.commandReady, topologyUsable, activeFile, queue, heartbeatState, and warnings.",
        "If commandReady is false, use pt_status op=doctor or pt_app op=status before running commands.",
        "If device names are uncertain, call pt_device op=list before pt_cmd_run.",
        "Prefer read-only tools until the user explicitly asks for changes.",
      ])),
  );

  ctx.server.registerPrompt(
    "pt.safe_show_batch",
    {
      title: "PT Safe IOS Show Batch",
      description: "Builds a safe pt_cmd_run request for multiple read-only IOS show commands using optimized batch behavior.",
      argsSchema: {
        device: z.string().optional().describe("Exact Packet Tracer device name."),
        commands: z.array(z.string()).optional().describe("Read-only IOS show commands."),
        goal: z.string().optional().describe("Validation or troubleshooting goal."),
      },
    },
    async ({ device, commands, goal }: { device?: string; commands?: string[]; goal?: string } = {}) =>
      textPrompt(lines([
        "Use pt_cmd_run for a read-only IOS validation batch.",
        goal ? `Goal: ${goal}` : null,
        device ? `Device: ${device}` : "If the exact device name is unknown, call pt_device op=list first.",
        "",
        "Recommended pt_cmd_run settings:",
        "- profile: audit for validation evidence, or fast for quick checks.",
        "- mode: safe.",
        "- allowConfirm: false.",
        "- allowDestructive: false.",
        "- continueOnError: true for multi-command show batches.",
        "- queueScope: device.",
        "- includeRawOutput: false unless debugging parsing.",
        "",
        commands?.length ? `Commands:\n${commands.map((command) => `- ${command}`).join("\n")}` : "Use only read-only show commands.",
        "",
        "After the call, inspect result.executionStrategy, failedSubcommandCount, subResults, warnings, and performance.",
        "optimized-runtime-multistep means the batch completed in one optimized terminal plan.",
        "optimized-runtime-partial-plus-sequential means PT produced partial optimized output and the MCP resumed only the remaining commands sequentially.",
      ])),
  );

  ctx.server.registerPrompt(
    "pt.partial_batch_recovery",
    {
      title: "PT Partial Batch Recovery",
      description: "Explains how to interpret optimized-runtime-partial-plus-sequential command results.",
      argsSchema: {
        device: z.string().optional(),
        nextCommandIndex: z.number().int().nonnegative().optional(),
      },
    },
    async ({ device, nextCommandIndex }: { device?: string; nextCommandIndex?: number } = {}) =>
      textPrompt(lines([
        "Interpret a partial optimized batch result.",
        device ? `Device: ${device}` : null,
        nextCommandIndex !== undefined ? `Sequential resume index: ${nextCommandIndex}` : null,
        "",
        "If executionStrategy is optimized-runtime-partial-plus-sequential:",
        "- Commands before optimizedRuntimeBatchNextCommandIndex were covered by the optimized run.",
        "- Commands at and after optimizedRuntimeBatchNextCommandIndex were resumed sequentially.",
        "- Do not report earlier optimized commands as repeated unless subResults prove it.",
        "- Use failedSubcommandCount and subResults[].ok to summarize failures.",
        "- Later subResults can still be valid even if an earlier resumed command failed and continueOnError=true.",
        "",
        "If a subcommand failed with IOS_INVALID_INPUT, explain that the command is unsupported on that device/PT IOS image, not necessarily that PT Control failed.",
      ])),
  );

  ctx.server.registerPrompt(
    "pt.device_troubleshoot",
    {
      title: "PT Device Troubleshooting",
      description: "Standard read-only workflow for troubleshooting one Packet Tracer router, switch, or host.",
      argsSchema: {
        device: z.string().optional(),
        symptom: z.string().optional(),
      },
    },
    async ({ device, symptom }: { device?: string; symptom?: string } = {}) =>
      textPrompt(lines([
        "Troubleshoot a Packet Tracer device using safe MCP tools.",
        symptom ? `Symptom: ${symptom}` : null,
        device ? `Device: ${device}` : "If the device name is unknown, call pt_device op=list.",
        "",
        "Workflow:",
        "1. pt_status op=summary.",
        "2. pt_device op=get for the device if inventory or ports matter.",
        "3. pt_cmd_run with safe read-only show commands.",
        "4. Use profile=audit when evidence matters.",
        "5. Summarize failed subcommands separately from successful outputs.",
        "",
        "Suggested IOS commands for switches:",
        "- show clock",
        "- show ip interface brief",
        "- show vlan brief",
        "- show interfaces trunk",
        "- show etherchannel summary",
        "- show spanning-tree summary",
        "",
        "Suggested IOS commands for routers/L3 switches:",
        "- show ip interface brief",
        "- show ip route",
        "- show running-config | section router",
        "- show access-lists",
      ])),
  );

  ctx.server.registerPrompt(
    "pt.topology_audit",
    {
      title: "PT Topology Audit",
      description: "Guides an agent through read-only topology and inventory inspection.",
      argsSchema: {
        focus: z.string().optional().describe("Optional area: links, devices, VLANs, routing, services."),
      },
    },
    async ({ focus }: { focus?: string } = {}) =>
      textPrompt(lines([
        "Audit the Packet Tracer topology safely.",
        focus ? `Focus: ${focus}` : null,
        "",
        "Recommended order:",
        "1. pt_status op=summary.",
        "2. pt_project op=status.",
        "3. pt_device op=list with includePorts=true if port mapping matters.",
        "4. pt_link op=list or pt_link op=verify for cabling/link checks.",
        "5. Use pt_cmd_run only after identifying exact device names.",
        "",
        "Keep add/remove/move operations out of the workflow unless the user explicitly requested topology changes.",
      ])),
  );

  ctx.server.registerPrompt(
    "pt.before_after_change",
    {
      title: "PT Before/After Change Validation",
      description: "Creates a safe before/after validation workflow around Packet Tracer lab changes.",
      argsSchema: {
        changeSummary: z.string().optional(),
        devices: z.array(z.string()).optional(),
      },
    },
    async ({ changeSummary, devices }: { changeSummary?: string; devices?: string[] } = {}) =>
      textPrompt(lines([
        "Use a before/after validation workflow.",
        changeSummary ? `Planned change: ${changeSummary}` : null,
        devices?.length ? `Devices: ${devices.join(", ")}` : null,
        "",
        "Before change:",
        "1. pt_status op=summary.",
        "2. pt_project op=autosave or pt_project op=checkpoints if the change is risky.",
        "3. Run read-only pt_cmd_run validation commands with profile=audit.",
        "",
        "After change:",
        "1. Run the same validation commands.",
        "2. Compare outputs and failedSubcommandCount.",
        "3. Check warnings, performance, and evidence timings.",
        "4. Save only when the user wants the resulting state preserved.",
      ])),
  );

  ctx.server.registerPrompt(
    "pt.config_change_guarded",
    {
      title: "PT Guarded Configuration Change",
      description: "Guides safe IOS configuration changes with explicit user intent, backups, and validation.",
      argsSchema: {
        device: z.string().optional(),
        changeSummary: z.string().optional(),
      },
    },
    async ({ device, changeSummary }: { device?: string; changeSummary?: string } = {}) =>
      textPrompt(lines([
        "Prepare a guarded Packet Tracer IOS configuration change.",
        device ? `Device: ${device}` : null,
        changeSummary ? `Change: ${changeSummary}` : null,
        "",
        "Rules:",
        "- Do not set allowDestructive=true unless the user explicitly requested destructive action.",
        "- Prefer pt_project op=autosave before risky changes.",
        "- Use pt_cmd_run mode=safe unless interactivity is needed.",
        "- Use allowConfirm=false by default.",
        "- Validate with read-only show commands after the change.",
        "- Report exact commands sent and validation evidence.",
      ])),
  );

  ctx.server.registerPrompt(
    "pt.explain_cmd_result",
    {
      title: "PT Explain Command Result",
      description: "Helps an agent explain pt_cmd_run structured output, performance, warnings, and partial batch results.",
      argsSchema: {
        focus: z.string().optional(),
      },
    },
    async ({ focus }: { focus?: string } = {}) =>
      textPrompt(lines([
        "Explain a pt_cmd_run result to the user.",
        focus ? `Focus: ${focus}` : null,
        "",
        "Inspect:",
        "- top-level ok and failedCount.",
        "- each results[].result.ok.",
        "- executionStrategy.",
        "- failedSubcommandCount.",
        "- subResults[].command, ok, status, warnings, and error.",
        "- performance.durationMs, dominantTiming, category, executionStrategy.",
        "- warnings such as CMD_SLOW_SUCCESS.",
        "",
        "For optimized-runtime-partial-plus-sequential, explain that the optimized run completed the first segment and the MCP resumed from optimizedRuntimeBatchNextCommandIndex.",
        "For IOS_INVALID_INPUT, say the command was not accepted by that device IOS image.",
      ])),
  );
}
