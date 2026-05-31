import { checkTailscaleStatus } from "./tailscale-status.js";

export async function resolvePublicUrl(): Promise<string | null> {
  try {
    const status = await checkTailscaleStatus();
    if (!status.selfIp || !status.hostname) return null;
    return `https://${status.hostname}.ts.net`;
  } catch {
    return null;
  }
}
