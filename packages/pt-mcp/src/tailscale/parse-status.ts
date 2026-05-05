type TailscaleStatus = {
  Self?: {
    DNSName?: string;
  };
};

type FunnelStatus = {
  Foreground?: Record<
    string,
    {
      Web?: Record<string, unknown>;
    }
  >;
};

function normalizeDnsName(dnsName: string | undefined): string | null {
  if (!dnsName) return null;
  const trimmed = dnsName.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\.$/, "");
}

export function extractPublicUrl(
  tailscaleStatus: TailscaleStatus,
  funnelStatus: FunnelStatus,
  path: string,
): string | null {
  const dnsName = normalizeDnsName(tailscaleStatus.Self?.DNSName);
  if (!dnsName) return null;

  const foreground = funnelStatus.Foreground ?? {};
  const hasActiveWebHandler = Object.values(foreground).some((entry) => {
    const web = entry.Web ?? {};
    return Object.keys(web).length > 0;
  });

  if (!hasActiveWebHandler) return null;

  return `https://${dnsName}${path}`;
}
