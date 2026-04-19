import { describe, expect, it } from "bun:test";
import {
  parseDeviceXml,
  extractRunningConfig,
  extractVlanTable,
  extractInterfaceList,
  extractHostname,
  extractModel,
  extractMacAddressTable,
  extractRoutingTable,
  extractArpTable,
  siphonDevice,
} from "../utils/device-xml-parser";

const ROUTER_XML = `<device>
  <hostname>R1</hostname>
  <model>2911</model>
  <typeId>0</typeId>
  <power>on</power>
  <iosVersion>15.2</iosVersion>
  <uptime>1 day 2 hours</uptime>
  <serialNumber>FTX1234567</serialNumber>
  <configRegister>0x2102</configRegister>
  <port>
    <name>GigabitEthernet0/0</name>
    <ipAddress>192.168.1.1</ipAddress>
    <subnetMask>255.255.255.0</subnetMask>
    <macAddress>00AA.BBCC.DD11</macAddress>
    <status>up</status>
    <protocol>up</protocol>
  </port>
  <port>
    <name>GigabitEthernet0/1</name>
    <ipAddress>10.0.0.1</ipAddress>
    <subnetMask>255.255.255.0</subnetMask>
    <macAddress>00AA.BBCC.DD12</macAddress>
    <status>up</status>
    <protocol>up</protocol>
  </port>
  <module>
    <slot>0</slot>
    <model>2911</model>
    <type>Router</type>
    <portRef>Port1</portRef>
    <portRef>Port2</portRef>
  </module>
  <vlan>
    <id>10</id>
    <name>DATA</name>
    <state>active</state>
  </vlan>
  <vlan>
    <id>20</id>
    <name>VOICE</name>
    <state>active</state>
  </vlan>
  <route>
    <type>C</type>
    <network>192.168.1.0</network>
    <mask>255.255.255.0</mask>
    <interface>GigabitEthernet0/0</interface>
  </route>
  <route>
    <type>S</type>
    <network>0.0.0.0</network>
    <mask>0.0.0.0</mask>
    <nextHop>192.168.1.254</nextHop>
    <interface>GigabitEthernet0/0</interface>
    <metric>0</metric>
  </route>
  <arpEntry>
    <ipAddress>192.168.1.100</ipAddress>
    <macAddress>00BB.CCDD.EE11</macAddress>
    <interface>GigabitEthernet0/0</interface>
    <type>dynamic</type>
  </arpEntry>
</device>`;

const SWITCH_XML = `<device>
  <hostname>SW1</hostname>
  <model>2960-24TT</model>
  <typeId>1</typeId>
  <power>on</power>
  <port>
    <name>FastEthernet0/1</name>
    <ipAddress>0.0.0.0</ipAddress>
    <subnetMask>0.0.0.0</subnetMask>
    <macAddress>0030.F300.0001</macAddress>
    <status>up</status>
    <vlan>1</vlan>
    <mode>dynamic</mode>
  </port>
  <vlan>
    <id>1</id>
    <name>default</name>
    <state>active</state>
  </vlan>
  <vlan>
    <id>10</id>
    <name>DATA</name>
    <state>active</state>
  </vlan>
  <macEntry>
    <vlan>1</vlan>
    <macAddress>00AA.BBCC.DD11</macAddress>
    <type>dynamic</type>
    <ports>FastEthernet0/1</ports>
  </macEntry>
  <macEntry>
    <vlan>10</vlan>
    <macAddress>00AA.BBCC.DD22</macAddress>
    <type>static</type>
    <ports>FastEthernet0/2</ports>
  </macEntry>
</device>`;

describe("device-xml-parser", () => {
  describe("parseDeviceXml", () => {
    it("parsea router con hostname, model, ports, modules y vlans", () => {
      const result = parseDeviceXml(ROUTER_XML);

      expect(result.hostname).toBe("R1");
      expect(result.model).toBe("2911");
      expect(result.typeId).toBe(0);
      expect(result.power).toBe(true);
      expect(result.version).toBe("15.2");
      expect(result.uptime).toBe("1 day 2 hours");
      expect(result.serialNumber).toBe("FTX1234567");
      expect(result.configRegister).toBe("0x2102");
      expect(result.ports).toHaveLength(2);
      expect(result.modules).toHaveLength(1);
      expect(result.vlans).toHaveLength(2);
      expect(result.routingTable).toHaveLength(2);
      expect(result.arpTable).toHaveLength(1);
    });

    it("parsea puertos con IPs y MACs", () => {
      const result = parseDeviceXml(ROUTER_XML);
      const port0 = result.ports[0];

      expect(port0.name).toBe("GigabitEthernet0/0");
      expect(port0.ipAddress).toBe("192.168.1.1");
      expect(port0.subnetMask).toBe("255.255.255.0");
      expect(port0.macAddress).toBe("00AA.BBCC.DD11");
      expect(port0.status).toBe("up");
      expect(port0.protocol).toBe("up");
    });

    it("parsea vlans correctamente", () => {
      const result = parseDeviceXml(ROUTER_XML);

      expect(result.vlans[0]).toEqual({ id: 10, name: "DATA", state: "active" });
      expect(result.vlans[1]).toEqual({ id: 20, name: "VOICE", state: "active" });
    });

    it("parsea routing table con tipo, network, nextHop", () => {
      const result = parseDeviceXml(ROUTER_XML);

      expect(result.routingTable[0].type).toBe("C");
      expect(result.routingTable[0].network).toBe("192.168.1.0");
      expect(result.routingTable[0].mask).toBe("255.255.255.0");
      expect(result.routingTable[1].type).toBe("S");
      expect(result.routingTable[1].nextHop).toBe("192.168.1.254");
    });

    it("parsea arp table", () => {
      const result = parseDeviceXml(ROUTER_XML);

      expect(result.arpTable[0].ipAddress).toBe("192.168.1.100");
      expect(result.arpTable[0].macAddress).toBe("00BB.CCDD.EE11");
      expect(result.arpTable[0].interface).toBe("GigabitEthernet0/0");
    });

    it("parsea switch con mac table y vlans", () => {
      const result = parseDeviceXml(SWITCH_XML);

      expect(result.hostname).toBe("SW1");
      expect(result.model).toBe("2960-24TT");
      expect(result.typeId).toBe(1);
      expect(result.macTable).toHaveLength(2);
      expect(result.macTable[0].vlan).toBe("1");
      expect(result.macTable[0].macAddress).toBe("00AA.BBCC.DD11");
      expect(result.macTable[0].type).toBe("dynamic");
      expect(result.macTable[0].ports).toEqual(["FastEthernet0/1"]);
      expect(result.macTable[1].type).toBe("static");
    });
  });

  describe("parseDeviceXml edge cases", () => {
    it("con XML vacío devuelve estructura vacía sin crashear", () => {
      const result = parseDeviceXml("");

      expect(result.hostname).toBe("");
      expect(result.model).toBe("");
      expect(result.typeId).toBeUndefined();
      expect(result.ports).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.vlans).toEqual([]);
      expect(result.routingTable).toEqual([]);
      expect(result.arpTable).toEqual([]);
      expect(result.macTable).toEqual([]);
      expect(result.rawXml).toBe("");
    });

    it("con XML malformado devuelve estructura con campos vacíos sin crashear", () => {
      const result = parseDeviceXml("<device><hostname>R1<X</device>");

      expect(result.hostname).toBe("");
      expect(result.ports).toEqual([]);
    });

    it("con XML muy corto devuelve estructura vacía", () => {
      const result = parseDeviceXml("<a/>");

      expect(result.hostname).toBe("");
      expect(result.ports).toEqual([]);
    });
  });

  describe("extractRunningConfig", () => {
    it("extrae running config del XML", () => {
      const xml = `<device><runningConfig>interface GigabitEthernet0/0</runningConfig></device>`;
      const config = extractRunningConfig(xml);

      expect(config).toBe("interface GigabitEthernet0/0");
    });

    it("devuelve XML crudo si no hay running config", () => {
      const config = extractRunningConfig("<device></device>");

      expect(config).toBe("<device></device>");
    });
  });

  describe("extractVlanTable", () => {
    it("extrae tabla de VLANs", () => {
      const result = extractVlanTable(SWITCH_XML);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(10);
    });
  });

  describe("extractInterfaceList", () => {
    it("extrae lista de puertos", () => {
      const result = extractInterfaceList(ROUTER_XML);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("GigabitEthernet0/0");
      expect(result[1].name).toBe("GigabitEthernet0/1");
    });
  });

  describe("extractHostname", () => {
    it("extrae hostname del router", () => {
      expect(extractHostname(ROUTER_XML)).toBe("R1");
    });

    it("devuelve string vacío si no hay hostname", () => {
      expect(extractHostname("<device></device>")).toBe("");
    });
  });

  describe("extractModel", () => {
    it("extrae modelo del router", () => {
      expect(extractModel(ROUTER_XML)).toBe("2911");
    });
  });

  describe("extractMacAddressTable", () => {
    it("extrae mac table del switch", () => {
      const result = extractMacAddressTable(SWITCH_XML);

      expect(result).toHaveLength(2);
    });
  });

  describe("extractRoutingTable", () => {
    it("extrae routing table del router", () => {
      const result = extractRoutingTable(ROUTER_XML);

      expect(result).toHaveLength(2);
    });
  });

  describe("extractArpTable", () => {
    it("extrae ARP table del router", () => {
      const result = extractArpTable(ROUTER_XML);

      expect(result).toHaveLength(1);
    });
  });

  describe("siphonDevice", () => {
    it("produce string con delimitadores ||| y :::", () => {
      const result = siphonDevice("R1", ROUTER_XML);

      expect(result).toContain("|||");
      expect(result).toContain("name:::R1");
      expect(result).toContain("hostname:::R1");
      expect(result).toContain("model:::2911");
    });

    it("incluye puertos con formato port::name::ip=X::mask=Y", () => {
      const result = siphonDevice("R1", ROUTER_XML);

      expect(result).toContain("port::GigabitEthernet0/0::ip=192.168.1.1");
      expect(result).toContain("vlan::10::DATA::active");
      expect(result).toContain("route::C::192.168.1.0/255.255.255.0::via=none");
    });

    it("funciona con device sin hostname", () => {
      const xml = `<device><model>generic</model></device>`;
      const result = siphonDevice("Device1", xml);

      expect(result).toContain("name:::Device1");
      expect(result).toContain("model:::generic");
    });
  });
});
