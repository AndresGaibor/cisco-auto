import { describe, it, expect } from "bun:test";
import { 
  parseHostPing, 
  parseHostIpconfig, 
  parseHostTracert, 
  parseHostArp,
  parseHostHistory,
  parseHostNslookup,
  parseHostNetstat
} from "./terminal-output-parsers.js";

describe("terminal-output-parsers", () => {
  describe("parseHostPing", () => {
    it("debe extraer estadísticas correctas de un ping exitoso", () => {
      const raw = `
        Pinging 192.168.1.1 with 32 bytes of data:
        Reply from 192.168.1.1: bytes=32 time<1ms TTL=255
        Reply from 192.168.1.1: bytes=32 time<1ms TTL=255

        Ping statistics for 192.168.1.1:
            Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
      `;
      const result = parseHostPing(raw);
      expect(result.facts.successReplies).toBe(4); // 4 del resumen manda sobre 2 líneas detalladas
      expect(result.facts.sent).toBe(4);
      expect(result.facts.received).toBe(4);
      expect(result.facts.lossPercent).toBe(0);
    });

    it("debe detectar pérdida total", () => {
      const raw = `
        Pinging 10.0.0.1 with 32 bytes of data:
        Request timed out.
        Request timed out.

        Ping statistics for 10.0.0.1:
            Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),
      `;
      const result = parseHostPing(raw);
      expect(result.facts.successReplies).toBe(0);
      expect(result.facts.lossPercent).toBe(100);
    });
  });

  describe("parseHostIpconfig", () => {
    it("debe extraer IP y Subnet Mask", () => {
      const raw = `
        FastEthernet0 Connection-specific DNS Suffix: 
        IPv4 Address. . . . . . . . . . . : 192.168.1.10
        Subnet Mask . . . . . . . . . . . : 255.255.255.0
        Default Gateway . . . . . . . . . : 192.168.1.1
      `;
      const result = parseHostIpconfig(raw);
      expect(result.facts.hasIPv4).toBe(true);
      expect(result.facts.ipv4Line).toContain("192.168.1.10");
      expect(result.facts.hasSubnetMask).toBe(true);
    });
  });

  describe("parseHostTracert", () => {
    it("debe contar los saltos correctamente", () => {
      const raw = `
        Tracing route to 8.8.8.8 over a maximum of 30 hops:
          1   1 ms    <1 ms    <1 ms  192.168.1.1
          2   5 ms    2 ms     3 ms   10.0.0.1
        Trace complete.
      `;
      const result = parseHostTracert(raw);
      expect(result.facts.hopCount).toBe(2);
    });
  });

  describe("parseHostHistory", () => {
    it("debe extraer comandos y outputs de una sesión mixta", () => {
      const raw = `
C:\\>ipconfig
IP: 10.0.0.5

Ventas-PC>ping 8.8.8.8
Pinging...
Trace complete.

Server-PT>arp -a
  1.1.1.1   aa.bb.cc
`;
      const result = parseHostHistory(raw);
      expect(result.facts.count).toBe(3);
      expect(result.facts.entries[0].command).toBe("ipconfig");
      expect(result.facts.entries[1].command).toBe("ping 8.8.8.8");
      expect(result.facts.entries[2].command).toBe("arp -a");
    });
  });

  describe("parseHostNslookup", () => {
    it("debe extraer el servidor DNS y la IP resuelta", () => {
      const raw = `
        Server:  google-public-dns-a.google.com
        Address:  8.8.8.8

        Name:    cisco.com
        Address:  72.163.4.161
      `;
      const result = parseHostNslookup(raw);
      expect(result.facts.dnsServer).toBe("google-public-dns-a.google.com");
      expect(result.facts.resolvedAddress).toBe("72.163.4.161");
      expect(result.facts.hasError).toBe(false);
    });

    it("debe detectar errores de nombre no encontrado", () => {
      const raw = "*** UnKnown can't find invalid.host: Non-existent domain";
      const result = parseHostNslookup(raw);
      expect(result.facts.hasError).toBe(true);
    });
  });

  describe("parseHostNetstat", () => {
    it("debe extraer conexiones TCP/UDP", () => {
      const raw = `
        Active Connections

          Proto  Local Address          Foreign Address        State
          TCP    192.168.1.10:1025      192.168.1.1:80         ESTABLISHED
          TCP    192.168.1.10:1026      10.0.0.5:443           TIME_WAIT
          UDP    0.0.0.0:5353           *:*                    
      `;
      const result = parseHostNetstat(raw);
      expect(result.facts.connectionCount).toBe(3);
      expect(result.facts.hasEstablished).toBe(true);
      expect((result.facts.connections as any[])[0].proto).toBe("TCP");
    });
  });

  describe("parseHostArp", () => {
    it("debe detectar entradas en la tabla ARP", () => {
      const raw = `
        Internet Address      Physical Address      Type
        192.168.1.1           0001.96A2.2A01        dynamic
        192.168.1.20          000C.CF82.1D01        dynamic
      `;
      const result = parseHostArp(raw);
      expect(result.facts.entryCount).toBe(2);
    });
  });
});
