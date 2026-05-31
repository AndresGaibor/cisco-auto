import { checkTailscaleStatus } from "./tailscale-status.js";

export async function resolvePublicUrl(): Promise<string | null> {
  try {
    const status = await checkTailscaleStatus();
    if (!status.selfIp) return null;
    // DNSName viene como "hostname.tailnet-name.ts.net." (con trailing dot)
    if (status.dnsName) {
      return `https://${status.dnsName.replace(/\.$/, "")}`;
    }
    // fallback: hostname + .ts.net
    if (status.hostname) {
      return `https://${status.hostname}.ts.net`;
    }
    return null;
  } catch {
    return null;
  }
}
