import { checkTailscaleStatus } from "./tailscale-status.js";

export async function resolvePublicUrl(publicPort?: number): Promise<string | null> {
  try {
    const status = await checkTailscaleStatus();
    if (!status.selfIp) return null;
    const dnsName = status.dnsName?.replace(/\.$/, "") ?? (status.hostname ? `${status.hostname}.ts.net` : null);
    if (!dnsName) return null;
    if (publicPort && publicPort !== 443) {
      return `https://${dnsName}:${publicPort}`;
    }
    return `https://${dnsName}`;
  } catch {
    return null;
  }
}
