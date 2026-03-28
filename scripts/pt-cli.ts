#!/usr/bin/env bun
import { promisify } from 'util';
import { exec } from 'child_process';
const execAsync = promisify(exec);

export async function runPtCommand(args: string[]): Promise<{ success: boolean; stdout?: string; stderr?: string }> {
  try {
    // Prefer 'pt' binary
    try {
      const whichRes = await execAsync('which pt');
      const whichOut = (whichRes && (whichRes as any).stdout || '').trim();
      if (whichOut) {
        const { stdout, stderr } = await execAsync(`pt ${args.map(a => String(a)).join(' ')}`);
        return { success: true, stdout, stderr };
      }
    } catch {
      // continue to fallback
    }

    // Fallback to bun run of packaged CLI
    const { stdout, stderr } = await execAsync(`bun run packages/pt-control-v2/dist/cli/index.js ${args.map(a => String(a)).join(' ')}`);
    return { success: true, stdout, stderr };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, stderr: msg };
  }
}
