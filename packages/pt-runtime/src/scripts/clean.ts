import { rmSync } from "node:fs";
import { resolve } from "node:path";

export function cleanWorkspaceOutputs(rootDir = process.cwd()): void {
  for (const dir of ["dist", "build", "generated"]) {
    rmSync(resolve(rootDir, dir), { recursive: true, force: true });
  }
}

if (import.meta.main) {
  cleanWorkspaceOutputs();
}
