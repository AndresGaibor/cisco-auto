import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { getLinkRegistry, saveLinkRegistry } from "../domain/link-registry";

export function handleRemoveLink(
  payload: { device: string; port: string },
  deps: HandlerDeps,
): HandlerResult {
  const { getLW, dprint } = deps;
  dprint(`[handler:removeLink] ${payload.device}:${payload.port}`);

  const registry = getLinkRegistry(deps.DEV_DIR, deps.getFM());
  const key = Object.keys(registry).find(
    (k) =>
      k.startsWith(`${payload.device}:${payload.port}--`) ||
      k.endsWith(`--${payload.device}:${payload.port}`),
  );
  if (key) {
    delete registry[key];
    saveLinkRegistry(deps.DEV_DIR, deps.getFM(), registry);
    dprint(`[handler:removeLink] removed registry entry: ${key}`);
  }
  getLW().deleteLink(payload.device, payload.port);
  dprint(`[handler:removeLink] SUCCESS`);
  return { ok: true };
}
