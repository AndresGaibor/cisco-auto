import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { collectLiveLinks } from "../domain/live-link";

export type ListLinksPayload = {
  type: "listLinks";
  device?: string;
  state?: string;
};

function normalizeState(value: unknown): string {
  const raw = String(value ?? "unknown").trim().toLowerCase();

  if (["green", "up", "operational", "on"].includes(raw)) return "green";
  if (["amber", "orange", "yellow"].includes(raw)) return "amber";
  if (["down", "red", "off", "missing", "disconnected"].includes(raw)) return "down";

  return raw || "unknown";
}

function matchesDevice(link: any, device?: string): boolean {
  if (!device) return true;

  return (
    String(link?.device1 ?? "") === device ||
    String(link?.device2 ?? "") === device ||
    String(link?.endpoint1?.device ?? "") === device ||
    String(link?.endpoint2?.device ?? "") === device
  );
}

function matchesState(link: any, state?: string): boolean {
  if (!state) return true;

  const wanted = normalizeState(state);
  const actual = normalizeState(link?.state);

  if (wanted === "up") return actual === "green";
  if (wanted === "down") return actual !== "green";

  return actual === wanted;
}

function buildStats(links: any[]) {
  return {
    linkCount: links.length,
    green: links.filter((link) => normalizeState(link?.state) === "green").length,
    amber: links.filter((link) => normalizeState(link?.state) === "amber").length,
    down: links.filter((link) => normalizeState(link?.state) === "down").length,
    unknown: links.filter((link) => normalizeState(link?.state) === "unknown").length,
  };
}

export function handleListLinks(payload: ListLinksPayload, deps: HandlerDeps): HandlerResult {
  const net = deps.getNet();

  const allLinks = collectLiveLinks(net);

  const links = allLinks.filter((link: any) => (
    matchesDevice(link, payload.device) &&
    matchesState(link, payload.state)
  ));

  return {
    ok: true,
    value: {
      source: "listLinks",
      links,
      stats: buildStats(links),
      evidence: [
        "collectLiveLinks(net)",
        "Port.getLink()",
        "Net.getLinkAt() fallback when needed",
      ],
    },
  };
}
