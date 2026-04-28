import { homedir } from "node:os";
import { join } from "node:path";

export function getSmokePtDevDir(): string {
  const home = homedir();
  return process.env.PT_DEV_DIR ?? join(process.env.USERPROFILE ?? home, "pt-dev");
}
