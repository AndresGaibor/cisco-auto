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
  path: string,
  publicPort?: number,
): string | null {
  const dnsName = normalizeDnsName(tailscaleStatus.Self?.DNSName);
  if (!dnsName) return null;

  let web = funnelStatus.Web ?? {};
  const fg = (funnelStatus as any).Foreground;
  if (fg) {
    if (fg.Web) {
      web = fg.Web;
    } else {
      for (const key of Object.keys(fg)) {
        if (fg[key] && fg[key].Web) {
          web = fg[key].Web;
          break;
        }
      }
    }
  }

  if (publicPort) {
    const portKey = `${dnsName}:${publicPort}`;
    const handler = web[portKey];
    if (!handler?.Handlers || Object.keys(handler.Handlers).length === 0) {
      return null;
    }
    return publicPort !== 443
      ? `https://${dnsName}:${publicPort}${path}`
      : `https://${dnsName}${path}`;
  }

  const hasActiveHandler = Object.values(web).some((entry) => {
    const handlers = entry.Handlers ?? {};
    return Object.keys(handlers).length > 0;
  });

  if (!hasActiveHandler) return null;

  return `https://${dnsName}${path}`;
}
