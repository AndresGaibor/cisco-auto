import { describe, expect, it } from "bun:test";
import {
  parseDeviceXml,
  extractInterfaceList,
  extractHostname,
  extractModel,
} from "../utils/device-xml-parser";
import { readFileSync } from "fs";

const PC1_XML = readFileSync("/Users/andresgaibor/pt-dev/pc1-raw.xml", "utf8");
const PC2_XML = readFileSync("/Users/andresgaibor/pt-dev/pc2-raw.xml", "utf8");
const S1_XML = readFileSync("/Users/andresgaibor/pt-dev/s1-raw.xml", "utf8");

describe("device-xml-parser PT real", () => {
  describe("PC1 - dispositivo final con IP configurado", () => {
    const result = parseDeviceXml(PC1_XML);

    it("hostname extraido de NAME", () => {
      expect(result.hostname).toBe("PC1");
    });

    it("model extraido de TYPE model=pc-pt", () => {
      expect(result.model).toBe("PC-PT");
    });

    it("serialNumber extraido de SERIALNUMBER", () => {
      expect(result.serialNumber).toBe("PTT08107QQ5");
    });

    it("power extraido de POWER", () => {
      expect(result.power).toBe(true);
    });

    it("tiene al menos un puerto con datos completos", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort).toBeDefined();
    });

    it("puerto FastEthernet extrae IP desde tag IP (no ipAddress)", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.ipAddress).toBe("192.168.10.20");
    });

    it("puerto FastEthernet extrae SUBNET (no subnetMask)", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.subnetMask).toBe("255.255.255.0");
    });

    it("puerto FastEthernet extrae MACADDRESS (no macAddress)", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.macAddress).toBe("0030.F265.E5CE");
    });

    it("puerto FastEthernet extrae FULLDUPLEX (no duplex)", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.duplex).toBe("true");
    });

    it("puerto FastEthernet extrae SPEED", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.speed).toBe("100");
    });

    it("puerto FastEthernet extrae BANDWIDTH", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.bandwidth).toBe("100000");
    });

    it("puerto FastEthernet extrae PINS", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.pins).toBe("false");
    });

    it("puerto FastEthernet extrae UP_METHOD", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.upMethod).toBe("5");
    });

    it("puerto Bluetooth no tiene IP", () => {
      const btPort = result.ports.find((p) => p.type === "eBluetooth");
      expect(btPort).toBeDefined();
      expect(btPort?.ipAddress).toBeUndefined();
    });
  });

  describe("PC2 - dispositivo final SIN IP configurado", () => {
    const result = parseDeviceXml(PC2_XML);

    it("hostname extraido correctamente", () => {
      expect(result.hostname).toBe("PC2");
    });

    it("model extraido", () => {
      expect(result.model).toBe("PC-PT");
    });

    it("serialNumber extraido", () => {
      expect(result.serialNumber).toBe("PTT081092AG");
    });

    it("puerto FastEthernet existe aunque IP este vacio", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort).toBeDefined();
    });

    it("puerto FastEthernet tiene MAC pero sin IP", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.macAddress).toBe("0009.7CC1.ED1C");
      expect(ethPort?.ipAddress).toBeUndefined();
      expect(ethPort?.subnetMask).toBeUndefined();
    });

    it("puerto tiene type, speed, duplex extraidos", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.type).toBe("eCopperFastEthernet");
      expect(ethPort?.speed).toBe("100");
      expect(ethPort?.duplex).toBe("true");
    });
  });

  describe("S1 - switch 24 puertos sin nombre dentro de PORT", () => {
    const result = parseDeviceXml(S1_XML);

    it("hostname extraido", () => {
      expect(result.hostname).toBe("S1");
    });

    it("model extraido", () => {
      expect(result.model).toBe("2960-24TT");
    });

    it("serialNumber extraido", () => {
      expect(result.serialNumber).toBe("CAT1010H3YX-");
    });

    it("24 puertos en resultado (no pierde puertos por falta de name)", () => {
      expect(result.ports.length).toBeGreaterThanOrEqual(24);
    });

    it("cada puerto tiene MAC, type, speed, duplex, bandwidth", () => {
      const firstPort = result.ports[0];
      expect(firstPort.macAddress).toBe("0003.E441.7001");
      expect(firstPort.type).toBe("eCopperFastEthernet");
      expect(firstPort.speed).toBe("100");
      expect(firstPort.duplex).toBe("true");
      expect(firstPort.bandwidth).toBe("100000");
    });

    it("puerto 25 y 26 son GigabitEthernet", () => {
      const giPorts = result.ports.filter((p) => p.type === "eCopperGigabitEthernet");
      expect(giPorts.length).toBe(2);
    });

    it("runningConfig extraido del tag RUNNINGCONFIG", () => {
      expect(result.runningConfig).toBeDefined();
      expect(result.runningConfig).toContain("interface FastEthernet0/1");
    });

    it("ports inferidas desde RUNNINGCONFIG tienen nombres FastEthernet0/X", () => {
      const names = result.ports.map((p) => p.name);
      expect(names.some((n) => n.includes("FastEthernet0/1"))).toBe(true);
    });

    it("VLANs extraidas desde tag VLANS", () => {
      expect(result.vlans.length).toBeGreaterThan(0);
      expect(result.vlans[0].id).toBe(1);
    });
  });

  describe("extractInterfaceList con XML real", () => {
    it("PC1 devuelve puertos con IP, MAC, type", () => {
      const ports = extractInterfaceList(PC1_XML);
      const ethPort = ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.ipAddress).toBe("192.168.10.20");
      expect(ethPort?.macAddress).toBe("0030.F265.E5CE");
    });

    it("PC2 devuelve puertos sin IP", () => {
      const ports = extractInterfaceList(PC2_XML);
      const ethPort = ports.find((p) => p.type === "eCopperFastEthernet");
      expect(ethPort?.macAddress).toBe("0009.7CC1.ED1C");
      expect(ethPort?.ipAddress).toBeUndefined();
    });

    it("S1 devuelve 24+ puertos", () => {
      const ports = extractInterfaceList(S1_XML);
      expect(ports.length).toBeGreaterThanOrEqual(24);
    });
  });

  describe("extractHostname y extractModel con XML real", () => {
    it("extractHostname para PC1", () => {
      expect(extractHostname(PC1_XML)).toBe("PC1");
    });

    it("extractHostname para S1", () => {
      expect(extractHostname(S1_XML)).toBe("S1");
    });

    it("extractModel para PC1", () => {
      expect(extractModel(PC1_XML)).toBe("PC-PT");
    });

    it("extractModel para S1", () => {
      expect(extractModel(S1_XML)).toBe("2960-24TT");
    });
  });
});
