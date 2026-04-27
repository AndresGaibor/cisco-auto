import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { collectLiveLinks, findLiveLink, findLiveLinkByEndpoint } from "../domain/live-link";
import type { VerifyLinkPayload } from "./link-types";

function buildAdvice(errors: string[], exact: any, endpoint1Link: any, endpoint2Link: any): string[] {
  if (errors.length > 0) {
    return [
      "Run: bun run pt device list",
      "Run: bun run pt device get <device>",
    ];
  }

  if (exact?.state === "green") return [];

  if (!exact && (endpoint1Link || endpoint2Link)) {
    return [
      "One of the requested ports is connected to another endpoint.",
      "Run: bun run pt link list --device <device>",
      "Run: bun run pt link remove <device>:<port> --force",
    ];
  }

  if (!exact) {
    return [
      "The requested link does not exist.",
      "Run: bun run pt link add <dev1>:<port1> <dev2>:<port2> --verify",
    ];
  }

  if (exact.state === "amber") {
    return [
      "The link exists but is amber. STP or negotiation may still be converging.",
      "Run: bun run pt cmd <switch> \"show spanning-tree\"",
      "Run: bun run pt link verify <a> <b> --wait-green 30000",
    ];
  }

  return [
    "The link exists but is not operational.",
    "Check interface shutdown state, power, cable type, and device boot status.",
  ];
}

export function handleVerifyLink(payload: VerifyLinkPayload, deps: HandlerDeps): HandlerResult {
  const net = deps.getNet();

  const device1 = net.getDevice(payload.device1);
  const device2 = net.getDevice(payload.device2);
  const errors: string[] = [];

  if (!device1) errors.push(`Device not found: ${payload.device1}`);
  if (!device2) errors.push(`Device not found: ${payload.device2}`);

  const port1 = device1 ? device1.getPort(payload.port1) : null;
  const port2 = device2 ? device2.getPort(payload.port2) : null;

  if (device1 && !port1) errors.push(`Port not found: ${payload.device1}:${payload.port1}`);
  if (device2 && !port2) errors.push(`Port not found: ${payload.device2}:${payload.port2}`);

  const liveLinks = collectLiveLinks(net);
  const exact = findLiveLink(liveLinks, payload.device1, payload.port1, payload.device2, payload.port2);
  const endpoint1Link = findLiveLinkByEndpoint(liveLinks, payload.device1, payload.port1);
  const endpoint2Link = findLiveLinkByEndpoint(liveLinks, payload.device2, payload.port2);

  const connected = Boolean(exact);
  const operational = exact?.state === "green";

  return {
    ok: true,
    value: {
      requested: {
        device1: payload.device1,
        port1: payload.port1,
        device2: payload.device2,
        port2: payload.port2,
      },
      endpointsExist: errors.length === 0,
      connected,
      exact: connected,
      operational,
      state: exact?.state ?? "missing",
      link: exact ?? null,
      endpoint1Link,
      endpoint2Link,
      errors,
      advice: buildAdvice(errors, exact, endpoint1Link, endpoint2Link),
      evidence: exact?.evidence ?? ["Packet Tracer live scan"],
      partiallyVerified: Boolean(exact && exact.state !== "green"),
      verified: Boolean(exact && exact.state === "green"),
    },
  };
}
