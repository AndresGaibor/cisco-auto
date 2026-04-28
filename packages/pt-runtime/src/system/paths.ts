import { homedir } from "node:os";
import { join } from "node:path";

export function getDefaultDevDir(): string {
  const home = homedir();
  const isWindows = process.platform === "win32";

  if (isWindows) {
    return process.env.PT_DEV_DIR ?? join(process.env.USERPROFILE ?? home, "pt-dev");
  }

  return process.env.PT_DEV_DIR ?? join(home, "pt-dev");
}
