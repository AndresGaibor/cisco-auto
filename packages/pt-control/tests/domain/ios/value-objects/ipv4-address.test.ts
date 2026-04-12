import { describe, it, expect } from "bun:test";
import { Ipv4Address, parseIpv4Address, isValidIpv4Address } from "@cisco-auto/kernel/domain/ios/value-objects";

describe("Ipv4Address", () => {
  describe("constructor", () => {
    it("creates a valid IPv4 address", () => {
      const ip = new Ipv4Address("192.168.1.1");
      expect(ip.value).toBe("192.168.1.1");
    });

    it("normalizes value", () => {
      const ip = new Ipv4Address("  192.168.1.1  ");
      expect(ip.value).toBe("192.168.1.1");
    });

    it("throws for invalid format", () => {
      expect(() => new Ipv4Address("not.an.ip.address")).toThrow();
    });

    it("throws for wrong octet count", () => {
      expect(() => new Ipv4Address("192.168.1")).toThrow();
      expect(() => new Ipv4Address("192.168.1.1.1")).toThrow();
    });

    it("throws for octets out of range", () => {
      expect(() => new Ipv4Address("192.168.1.256")).toThrow();
      expect(() => new Ipv4Address("192.168.1.-1")).toThrow();
    });

    it("throws for leading zeros", () => {
      expect(() => new Ipv4Address("192.168.01.1")).toThrow();
    });
  });

  describe("parseIpv4Address", () => {
    it("parses valid address", () => {
      const ip = parseIpv4Address("10.0.0.1");
      expect(ip.value).toBe("10.0.0.1");
    });
  });

  describe("isValidIpv4Address", () => {
    it("returns true for valid addresses", () => {
      expect(isValidIpv4Address("192.168.1.1")).toBe(true);
      expect(isValidIpv4Address("0.0.0.0")).toBe(true);
      expect(isValidIpv4Address("255.255.255.255")).toBe(true);
    });

    it("returns false for invalid addresses", () => {
      expect(isValidIpv4Address("")).toBe(false);
      expect(isValidIpv4Address("192.168.1.256")).toBe(false);
      expect(isValidIpv4Address("not.ip")).toBe(false);
    });
  });

  describe("octets", () => {
    it("returns octets as tuple", () => {
      const ip = new Ipv4Address("192.168.1.1");
      expect(ip.octets).toEqual([192, 168, 1, 1]);
    });
  });

  describe("toInt", () => {
    it("converts to 32-bit integer", () => {
      const ip = new Ipv4Address("192.168.1.1");
      expect(ip.toInt()).toBe(3232235777);
    });
  });

  describe("isPrivate", () => {
    it("detects 10.0.0.0/8", () => {
      expect(new Ipv4Address("10.0.0.1").isPrivate).toBe(true);
      expect(new Ipv4Address("10.255.255.255").isPrivate).toBe(true);
    });

    it("detects 172.16.0.0/12", () => {
      expect(new Ipv4Address("172.16.0.1").isPrivate).toBe(true);
      expect(new Ipv4Address("172.31.255.255").isPrivate).toBe(true);
      expect(new Ipv4Address("172.15.0.1").isPrivate).toBe(false);
    });

    it("detects 192.168.0.0/16", () => {
      expect(new Ipv4Address("192.168.0.1").isPrivate).toBe(true);
      expect(new Ipv4Address("192.168.255.255").isPrivate).toBe(true);
      expect(new Ipv4Address("192.169.0.1").isPrivate).toBe(false);
    });

    it("returns false for public addresses", () => {
      expect(new Ipv4Address("8.8.8.8").isPrivate).toBe(false);
      expect(new Ipv4Address("1.1.1.1").isPrivate).toBe(false);
    });
  });

  describe("isLoopback", () => {
    it("detects 127.0.0.0/8", () => {
      expect(new Ipv4Address("127.0.0.1").isLoopback).toBe(true);
      expect(new Ipv4Address("127.255.255.255").isLoopback).toBe(true);
      expect(new Ipv4Address("128.0.0.1").isLoopback).toBe(false);
    });
  });

  describe("isApipa", () => {
    it("detects 169.254.0.0/16", () => {
      expect(new Ipv4Address("169.254.0.1").isApipa).toBe(true);
      expect(new Ipv4Address("169.254.255.255").isApipa).toBe(true);
      expect(new Ipv4Address("169.253.0.1").isApipa).toBe(false);
    });
  });

  describe("isMulticast", () => {
    it("detects 224.0.0.0/4", () => {
      expect(new Ipv4Address("224.0.0.1").isMulticast).toBe(true);
      expect(new Ipv4Address("239.255.255.255").isMulticast).toBe(true);
      expect(new Ipv4Address("223.255.255.255").isMulticast).toBe(false);
    });
  });

  describe("isBroadcast", () => {
    it("detects 255.255.255.255", () => {
      expect(new Ipv4Address("255.255.255.255").isBroadcast).toBe(true);
      expect(new Ipv4Address("255.255.255.254").isBroadcast).toBe(false);
    });
  });

  describe("equals", () => {
    it("returns true for same address", () => {
      expect(new Ipv4Address("192.168.1.1").equals(new Ipv4Address("192.168.1.1"))).toBe(true);
    });

    it("returns false for different addresses", () => {
      expect(new Ipv4Address("192.168.1.1").equals(new Ipv4Address("192.168.1.2"))).toBe(false);
    });
  });

  describe("toString", () => {
    it("returns string representation", () => {
      expect(new Ipv4Address("192.168.1.1").toString()).toBe("192.168.1.1");
    });
  });
});
