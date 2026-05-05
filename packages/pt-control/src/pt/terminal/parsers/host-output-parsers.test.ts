import { describe, expect, test } from "bun:test";
import {
  parseHostIpconfig,
  parseHostPing,
  parseHostTracert,
} from "./host-output-parsers.js";

describe("host-output-parsers", () => {
  test("parseHostIpconfig detecta IPv4 y gateway", () => {
    const parsed = parseHostIpconfig(`
FastEthernet0 Connection:
   IP Address......................: 192.168.1.10
   Subnet Mask.....................: 255.255.255.0
   Default Gateway.................: 192.168.1.1
`);

    expect(parsed.parserId).toBe("host.ipconfig");
    expect(parsed.facts.hasIPv4).toBe(true);
    expect(parsed.facts.hasSubnetMask).toBe(true);
    expect(parsed.facts.hasDefaultGateway).toBe(true);
  });

  test("parseHostPing usa estadisticas si no hay replies individuales", () => {
    const parsed = parseHostPing(`
Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
`);

    expect(parsed.parserId).toBe("host.ping");
    expect(parsed.facts.successReplies).toBe(4);
    expect(parsed.facts.received).toBe(4);
    expect(parsed.facts.lossPercent).toBe(0);
  });

  test("parseHostTracert extrae hops simples", () => {
    const parsed = parseHostTracert(`
1 192.168.1.1 1 ms
2 10.0.0.1 3 ms
`);

    expect(parsed.parserId).toBe("host.tracert");
    expect(parsed.facts.hopCount).toBe(2);
  });
});
