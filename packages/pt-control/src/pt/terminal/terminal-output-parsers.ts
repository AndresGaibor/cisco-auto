import {
  parseIosShowCdpNeighbors,
  parseIosShowIpInterfaceBrief,
  parseIosShowIpRoute,
  parseIosShowMacAddressTable,
  parseIosShowRunningConfig,
  parseIosShowVersion,
  parseIosShowVlanBrief,
} from "./parsers/ios-output-parsers.js";
import {
  parseHostArp,
  parseHostHistory,
  parseHostIpconfig,
  parseHostNetstat,
  parseHostNslookup,
  parseHostPing,
  parseHostTracert,
} from "./parsers/host-output-parsers.js";
import { createRawEvidence } from "./parsers/parser-helpers.js";

export interface ParsedTerminalEvidence {
  parserId: string;
  facts: Record<string, unknown>;
}

export function parseTerminalOutput(
  capabilityId: string,
  raw: string,
): ParsedTerminalEvidence | null {
  const handlers: Record<string, (input: string) => ParsedTerminalEvidence | null> = {
    "terminal.show-version": parseIosShowVersion,
    "terminal.show-running-config": parseIosShowRunningConfig,
    "terminal.show-ip-interface-brief": parseIosShowIpInterfaceBrief,
    "terminal.show-vlan-brief": parseIosShowVlanBrief,
    "terminal.show-cdp-neighbors": parseIosShowCdpNeighbors,
    "terminal.show-ip-route": parseIosShowIpRoute,
    "terminal.show-mac-address-table": parseIosShowMacAddressTable,
    "host.ipconfig": parseHostIpconfig,
    "host.ping": parseHostPing,
    "host.tracert": parseHostTracert,
    "host.arp": parseHostArp,
    "host.nslookup": parseHostNslookup,
    "host.netstat": parseHostNetstat,
    "host.history": parseHostHistory,
    "host.route": (input) => createRawEvidence("host.route", input),
    "host.command": (input) => createRawEvidence("host.command", input),
  };

  return handlers[capabilityId]?.(raw) ?? null;
}

export {
  parseIosShowCdpNeighbors,
  parseIosShowIpInterfaceBrief,
  parseIosShowIpRoute,
  parseIosShowMacAddressTable,
  parseIosShowRunningConfig,
  parseIosShowVersion,
  parseIosShowVlanBrief,
} from "./parsers/ios-output-parsers.js";

export {
  parseHostArp,
  parseHostHistory,
  parseHostIpconfig,
  parseHostNetstat,
  parseHostNslookup,
  parseHostPing,
  parseHostTracert,
} from "./parsers/host-output-parsers.js";
