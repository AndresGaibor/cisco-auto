import { checkTailscaleStatus, startTailscaleServe, startTailscaleFunnel } from "./tailscale-status.js";
import { resolvePublicUrl } from "./resolve-public-url.js";

export interface StartServeOrFunnelResult {
  mode: "off" | "serve" | "funnel";
  publicUrl: string | null;
  error?: string;
}

export async function startServeOrFunnel(
  port: number,
  mode: "off" | "serve" | "funnel",
): Promise<StartServeOrFunnelResult> {
  if (mode === "off") {
    return { mode: "off", publicUrl: null };
  }

  const status = await checkTailscaleStatus();

  if (!status.available || !status.loggedIn) {
    return {
      mode: "off",
      publicUrl: null,
      error: status.error ?? "Tailscale no disponible o no logueado",
    };
  }

  if (mode === "funnel") {
    const result = await startTailscaleFunnel(port);
    if (!result.ok) {
      return { mode: "off", publicUrl: null, error: result.error || "Funnel falló" };
    }
  } else {
    const result = await startTailscaleServe(port);
    if (!result.ok) {
      return { mode: "off", publicUrl: null, error: result.error || "Serve falló" };
    }
  }

  const publicUrl = await resolvePublicUrl();

  return { mode, publicUrl };
}
