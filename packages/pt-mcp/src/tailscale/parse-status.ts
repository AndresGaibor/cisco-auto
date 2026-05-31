type TailscaleStatus = {
  Self?: {
    DNSName?: string;
  };
};

type FunnelStatus = {
  TCP?: Record<string, { HTTPS?: boolean }>;
  Web?: Record<
    string,
    {
      Handlers?: Record<string, { Proxy?: string }>;
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
  _path: string,
): string | null {
  const dnsName = normalizeDnsName(tailscaleStatus.Self?.DNSName);
  if (!dnsName) return null;

  const web = funnelStatus.Web ?? {};
  const hasActiveHandler = Object.values(web).some((entry) => {
    const handlers = entry.Handlers ?? {};
    return Object.keys(handlers).length > 0;
  });

  if (!hasActiveHandler) return null;

  return `https://${dnsName}${_path}`;
}
