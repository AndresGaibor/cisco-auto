import { describe, it, expect } from "bun:test";
import {
  parseNetworkCidr,
  buildDhcpServiceCommands,
  buildNtpServiceCommands,
  buildSyslogServiceCommands,
} from "./network-services-use-cases";

describe("Network Services Use Cases", () => {
  describe("parseNetworkCidr", () => {
    it("parsea red con CIDR", () => {
      const result = parseNetworkCidr("192.168.1.0/24");
      expect(result.network).toBe("192.168.1.0");
      expect(result.mask).toBe("255.255.255.0");
    });

    it("parsea CIDR /16", () => {
      const result = parseNetworkCidr("10.0.0.0/16");
      expect(result.network).toBe("10.0.0.0");
      expect(result.mask).toBe("255.255.0.0");
    });

    it("parsea CIDR /8", () => {
      const result = parseNetworkCidr("172.16.0.0/8");
      expect(result.network).toBe("172.16.0.0");
      expect(result.mask).toBe("255.0.0.0");
    });

    it("devuelve defaults para input vacío", () => {
      const result = parseNetworkCidr("");
      expect(result.network).toBe("0.0.0.0");
      expect(result.mask).toBe("255.255.255.0");
    });

    it("devuelve mask default si CIDR inválido", () => {
      const result = parseNetworkCidr("192.168.1.0/invalid");
      expect(result.network).toBe("192.168.1.0");
      expect(result.mask).toBe("255.255.255.0");
    });

    it("devuelve mask default si no hay CIDR", () => {
      const result = parseNetworkCidr("192.168.1.0");
      expect(result.network).toBe("192.168.1.0");
      expect(result.mask).toBe("255.255.255.0");
    });
  });

  describe("buildDhcpServiceCommands", () => {
    it("genera comandos DHCP válidos", () => {
      const commands = buildDhcpServiceCommands("R1", "LAN_POOL", "192.168.1.0/24");
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some((c) => c.includes("dhcp") || c.includes("pool"))).toBe(true);
    });

    it("lanza error para spec inválida", () => {
      expect(() => buildDhcpServiceCommands("", "", "")).toThrow();
    });
  });

  describe("buildNtpServiceCommands", () => {
    it("genera comandos NTP válidos", () => {
      const commands = buildNtpServiceCommands("R1", "pool.ntp.org");
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some((c) => c.includes("ntp") || c.includes("server"))).toBe(true);
    });
  });

  describe("buildSyslogServiceCommands", () => {
    it("genera comandos Syslog válidos", () => {
      const commands = buildSyslogServiceCommands("R1", "192.168.1.100");
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some((c) => c.includes("logging") || c.includes("syslog"))).toBe(true);
    });
  });
});