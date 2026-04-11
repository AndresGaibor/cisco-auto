#!/usr/bin/env bun

import { runSubprocess, type RunSubprocessResult } from '../apps/pt-cli/src/system/run-subprocess.ts';

export async function runPtCommand(args: string[]): Promise<RunSubprocessResult> {
  const ptBinary = Bun.which('pt');

  if (ptBinary) {
    return runSubprocess({
      cmd: [ptBinary, ...args.map((arg) => String(arg))],
    });
  }

  return runSubprocess({
    cmd: ['bun', 'run', 'packages/pt-control/bin/run.js', ...args.map((arg) => String(arg))],
  });
}
