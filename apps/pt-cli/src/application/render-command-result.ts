#!/usr/bin/env bun

import type { CliResult } from "../contracts/cli-result.js";
import type { GlobalFlags } from "../flags.js";
import { formatNextSteps } from "../ux/next-steps.js";
import { renderCliResult } from "../ux/renderers.js";

export type RenderCommandResultOptions<T> = {
  result: CliResult<T>;
  flags: GlobalFlags;
  nextSteps?: string[];
};

export function renderCommandResult<T>({
  result,
  flags,
  nextSteps = [],
}: RenderCommandResultOptions<T>): void {
  const output = renderCliResult(result, flags.output);

  if (!flags.quiet || !result.ok) {
    console.log(output);
  }

  if (!flags.json && result.ok && result.data && nextSteps.length > 0 && !flags.quiet) {
    console.log(formatNextSteps(nextSteps));
  }

  if (!result.ok) {
    process.exit(1);
  }
}
