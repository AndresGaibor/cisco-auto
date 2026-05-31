
export interface RegisterResourceContext {
  server: {
    registerResource: (...args: any[]) => void;
  };
}

interface GuideResource {
  name: string;
  uri: string;
  title: string;
  description: string;
  text: string;
}

const resources: GuideResource[] = [
  {
    name: "pt.guide.agent_usage",
    uri: "pt://guide/agent-usage",
    title: "PT Control Agent Usage Guide",
    description: "Recommended tool order and safety rules for agents using Packet Tracer Control MCP.",
    text: `# PT Control Agent Usage Guide

Recommended order:

1. Call pt_status with op="summary".
2. If the exact device name is unknown, call pt_device with op="list".
3. Use pt_cmd_run for IOS/host commands.
4. Prefer read-only show commands unless the user explicitly asks for changes.
5. Use pt_project autosave/checkpoints before risky modifications.

Safety defaults:

- mode: "safe"
- allowConfirm: false
- allowDestructive: false
- queueScope: "device"
- profile: "fast" for quick checks, "audit" for validation, "debug" for terminal troubleshooting

Never use pt_omni for normal IOS command execution. It is experimental recovery/diagnostic access.`,
  },
  {
    name: "pt.guide.cmd_run_performance",
    uri: "pt://guide/cmd-run-performance",
    title: "PT Command Performance Guide",
    description: "How to interpret pt_cmd_run performance diagnostics and slow warnings.",
    text: `# PT Command Performance Guide

pt_cmd_run returns performance diagnostics per job.

Important fields:

- durationMs: total measured duration used for slow detection.
- slow: true when a successful command exceeds slowThresholdMs.
- dominantTiming: timing path most likely responsible for latency.
- category: bridge_wait, queue_latency, execution_latency, poll_sleep, parse, planner_or_submit, retry_or_recovery, pager_fallback, sequential_batch, or unknown.
- executionStrategy: sequential-subcommands, optimized-runtime-multistep, or optimized-runtime-partial-plus-sequential.

Warnings:

- CMD_SLOW_SUCCESS means the command succeeded but was slow.
- Optimized batch warnings usually point to runtimeTerminalBatchOptimizedRunPlanMs.
- Sequential batch warnings include the slowest subcommand when available.`,
  },
  {
    name: "pt.recipe.safe_batch_show",
    uri: "pt://recipes/safe-batch-show",
    title: "Safe Batch Show Recipe",
    description: "Recipe for running multiple read-only IOS show commands efficiently.",
    text: `# Safe Batch Show Recipe

Use pt_cmd_run with:

- profile: "audit" or "fast"
- mode: "safe"
- allowConfirm: false
- allowDestructive: false
- continueOnError: true
- queueScope: "device"
- includeRawOutput: false unless debugging

Example commands:

- show clock
- show ip interface brief
- show vlan brief
- show interfaces trunk
- show etherchannel summary
- show spanning-tree summary
- show ip route

Interpret executionStrategy:

- optimized-runtime-multistep: all commands completed in one optimized terminal plan.
- optimized-runtime-partial-plus-sequential: the optimized plan produced partial results and MCP resumed remaining commands sequentially.
- sequential-subcommands: MCP ran commands one by one.`,
  },
  {
    name: "pt.recipe.partial_batch_recovery",
    uri: "pt://recipes/partial-batch-recovery",
    title: "Partial Batch Recovery Recipe",
    description: "How to interpret optimized partial batch recovery.",
    text: `# Partial Batch Recovery Recipe

When executionStrategy is optimized-runtime-partial-plus-sequential:

- optimizedRuntimeBatchPartial=true
- optimizedRuntimeBatchMatchedCommandCount tells how many commands were covered by the optimized run.
- optimizedRuntimeBatchNextCommandIndex tells where sequential recovery resumed.
- subResults contains both optimized and resumed sequential results.
- failedSubcommandCount counts failed subcommands across the final combined result.

Do not rerun already covered commands unless the user asks. Continue using later successful subResults even if one resumed command failed and continueOnError=true.`,
  },
  {
    name: "pt.recipe.config_change_guarded",
    uri: "pt://recipes/config-change-guarded",
    title: "Guarded Configuration Change Recipe",
    description: "Safe workflow for IOS configuration changes in Packet Tracer.",
    text: `# Guarded Configuration Change Recipe

Before making a configuration change:

1. Confirm user intent.
2. Call pt_status op="summary".
3. Call pt_project op="autosave" for risky changes.
4. Capture before-state with read-only pt_cmd_run show commands.

During change:

- Use mode="safe" when possible.
- Keep allowConfirm=false unless the user approved prompts.
- Keep allowDestructive=false unless explicitly requested.

After change:

1. Run validation show commands.
2. Compare before/after state.
3. Report commands, validation evidence, warnings, and failures.
4. Save only if the user wants the lab state preserved.`,
  },
];

export function registerResources(ctx: RegisterResourceContext): void {
  for (const resource of resources) {
    ctx.server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: "text/markdown",
      },
      async () => ({
        contents: [
          {
            uri: resource.uri,
            mimeType: "text/markdown",
            text: resource.text,
          },
        ],
      }),
    );
  }
}

export { resources as ptGuideResources };
