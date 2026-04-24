import { describe, expect, it } from "bun:test";
import { parseDeviceXml, extractInterfaceList, extractHostname, extractModel } from "../utils/device-xml-parser";

const PC1_XML = `
<DEVICE>
  <ENGINE>
    <TYPE model="PC-PT">PC</TYPE>
    <NAME translate="true">PC1</NAME>
    <POWER>true</POWER>
    <SERIALNUMBER>PTT08107QQ5</SERIALNUMBER>
    <PORT>
      <TYPE>eCopperFastEthernet</TYPE>
      <IP>192.168.10.20</IP>
      <SUBNET>255.255.255.0</SUBNET>
      <MACADDRESS>0030.F265.E5CE</MACADDRESS>
      <FULLDUPLEX>true</FULLDUPLEX>
      <SPEED>100</SPEED>
      <BANDWIDTH>100000</BANDWIDTH>
      <PINS>false</PINS>
      <UP_METHOD>5</UP_METHOD>
    </PORT>
    <PORT>
      <TYPE>eBluetooth</TYPE>
    </PORT>
  </ENGINE>
</DEVICE>`;

const PC2_XML = `
<DEVICE>
  <ENGINE>
    <TYPE model="PC-PT">PC</TYPE>
    <NAME translate="true">PC2</NAME>
    <POWER>true</POWER>
    <SERIALNUMBER>PTT081092AG</SERIALNUMBER>
    <PORT>
      <TYPE>eCopperFastEthernet</TYPE>
      <MACADDRESS>0009.7CC1.ED1C</MACADDRESS>
      <FULLDUPLEX>true</FULLDUPLEX>
      <SPEED>100</SPEED>
    </PORT>
  </ENGINE>
</DEVICE>`;

const S1_XML = `
<DEVICE>
  <ENGINE>
    <TYPE model="2960-24TT">CiscoDevice</TYPE>
    <NAME translate="true">S1</NAME>
    <POWER>true</POWER>
    <SERIALNUMBER>CAT1010H3YX-</SERIALNUMBER>
    <PORT>
      <TYPE>eCopperFastEthernet</TYPE>
      <MACADDRESS>0003.E441.7001</MACADDRESS>
      <FULLDUPLEX>true</FULLDUPLEX>
      <SPEED>100</SPEED>
      <BANDWIDTH>100000</BANDWIDTH>
    </PORT>
    <PORT>
      <TYPE>eCopperFastEthernet</TYPE>
      <MACADDRESS>0003.E441.7002</MACADDRESS>
      <FULLDUPLEX>true</FULLDUPLEX>
      <SPEED>100</SPEED>
      <BANDWIDTH>100000</BANDWIDTH>
    </PORT>
    <PORT>
      <TYPE>eCopperGigabitEthernet</TYPE>
      <MACADDRESS>0003.E441.7003</MACADDRESS>
      <FULLDUPLEX>true</FULLDUPLEX>
      <SPEED>1000</SPEED>
      <BANDWIDTH>1000000</BANDWIDTH>
    </PORT>
    <PORT>
      <TYPE>eCopperGigabitEthernet</TYPE>
      <MACADDRESS>0003.E441.7004</MACADDRESS>
      <FULLDUPLEX>true</FULLDUPLEX>
      <SPEED>1000</SPEED>
      <BANDWIDTH>1000000</BANDWIDTH>
    </PORT>
    <RUNNINGCONFIG>
      <LINE>interface FastEthernet0/1</LINE>
      <LINE> switchport mode access</LINE>
      <LINE> switchport access vlan 10</LINE>
      <LINE>!</LINE>
    </RUNNINGCONFIG>
    <VLANS>
      <VLAN>
        <ID>1</ID>
        <NAME>default</NAME>
        <STATE>active</STATE>
      </VLAN>
      <VLAN>
        <ID>10</ID>
        <NAME>DATA</NAME>
        <STATE>active</STATE>
      </VLAN>
    </VLANS>
  </ENGINE>
</DEVICE>`;

const WLC_XML = `
<DEVICE>
  <ENGINE>
    <TYPE model="WLC-PT">Wireless LAN Controller</TYPE>
    <NAME translate="true">Wireless LAN Controller1</NAME>
    <POWER>true</POWER>
    <VLANS>
      <VLAN>
        <NUMBER>1</NUMBER>
        <NAME>default</NAME>
        <STATE>active</STATE>
      </VLAN>
      <VLAN>
        <NUMBER>10</NUMBER>
        <NAME>DOCENTES</NAME>
        <STATE>active</STATE>
      </VLAN>
      <VLAN>
        <NUMBER>20</NUMBER>
        <NAME>ESTUDIANTES</NAME>
        <STATE>active</STATE>
      </VLAN>
    </VLANS>
  </ENGINE>
</DEVICE>`;

// Formato real de PT: tags self-closing con atributos
const WLC_SELFCLOSING_XML = `
<DEVICE>
  <ENGINE>
    <TYPE model="WLC-2504">Wireless LAN Controller</TYPE>
    <NAME translate="true">WLC1</NAME>
    <POWER>true</POWER>
    <VLANS>
      <VLAN name="default" number="1" rspan="0"/>
      <VLAN name="DOCENTES" number="10" rspan="0"/>
      <VLAN name="ESTUDIANTES" number="20" rspan="0"/>
      <VLAN name="EDUROAM" number="30" rspan="0"/>
    </VLANS>
  </ENGINE>
</DEVICE>`;

// Formato self-closing para switch real (2960 style)
const SWITCH_SELFCLOSING_XML = `
<DEVICE>
  <ENGINE>
    <TYPE model="2960-24TT">CiscoDevice</TYPE>
    <NAME translate="true">SW1</NAME>
    <POWER>true</POWER>
    <VLANS>
      <VLAN name="default" number="1" rspan="0"/>
      <VLAN name="DATA" number="10" rspan="0"/>
      <VLAN name="VOICE" number="20" rspan="0"/>
      <VLAN name="GUEST" number="99" rspan="0"/>
    </VLANS>
  </ENGINE>
</DEVICE>`;

describe("device-xml-parser PT real", () => {
  describe("PC1 - dispositivo final con IP configurado", () => {
    const result = parseDeviceXml(PC1_XML);

    it("hostname extraido de NAME translate", () => {
      expect(result.hostname).toBe("PC1");
    });

    it("model extraido de TYPE model=pc-pt", () => {
      expect(result.model).toBe("PC-PT");
    });

    it("serialNumber extraido de SERIALNUMBER", () => {
      expect(result.serialNumber).toBe("PTT08107QQ5");
    });

    it("puerto FastEthernet extrae IP, MAC y métricas", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");

      expect(ethPort).toBeDefined();
      expect(ethPort?.ipAddress).toBe("192.168.10.20");
      expect(ethPort?.subnetMask).toBe("255.255.255.0");
      expect(ethPort?.macAddress).toBe("0030.F265.E5CE");
      expect(ethPort?.duplex).toBe("true");
      expect(ethPort?.speed).toBe("100");
      expect(ethPort?.bandwidth).toBe("100000");
      expect(ethPort?.pins).toBe("false");
      expect(ethPort?.upMethod).toBe("5");
    });

    it("puerto Bluetooth existe sin IP", () => {
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

    it("puerto FastEthernet existe aunque IP este vacía", () => {
      const ethPort = result.ports.find((p) => p.type === "eCopperFastEthernet");

      expect(ethPort).toBeDefined();
      expect(ethPort?.macAddress).toBe("0009.7CC1.ED1C");
      expect(ethPort?.ipAddress).toBeUndefined();
      expect(ethPort?.subnetMask).toBeUndefined();
    });
  });

  describe("S1 - switch con running-config real", () => {
    const result = parseDeviceXml(S1_XML);

    it("hostname extraido", () => {
      expect(result.hostname).toBe("S1");
    });

    it("model extraido", () => {
      expect(result.model).toBe("2960-24TT");
    });

    it("runningConfig extraido del tag RUNNINGCONFIG", () => {
      expect(result.runningConfig).toContain("interface FastEthernet0/1");
      expect(result.runningConfig).toContain("switchport access vlan 10");
    });

    it("extractInterfaceList preserva los puertos", () => {
      const ports = extractInterfaceList(S1_XML);

      expect(ports.length).toBe(4);
      expect(ports[0]?.macAddress).toBe("0003.E441.7001");
      expect(ports.filter((p) => p.type === "eCopperGigabitEthernet")).toHaveLength(2);
    });

    it("extractHostname y extractModel funcionan con XML PT", () => {
      expect(extractHostname(S1_XML)).toBe("S1");
      expect(extractModel(S1_XML)).toBe("2960-24TT");
    });

    it("VLANs extraidas desde tag VLANS", () => {
      expect(result.vlans).toHaveLength(2);
      expect(result.vlans[0]?.id).toBe(1);
    });

    it("WLC preserva VLANs con NUMBER", () => {
      const result = parseDeviceXml(WLC_XML);

      expect(result.hostname).toBe("Wireless LAN Controller1");
      expect(result.vlans).toHaveLength(3);
      expect(result.vlans.map((v) => v.id)).toEqual([1, 10, 20]);
      expect(result.vlans[1]).toEqual({ id: 10, name: "DOCENTES", state: "active" });
    });

    it("WLC preserva VLANs self-closing con atributos name/number/rspan", () => {
      const result = parseDeviceXml(WLC_SELFCLOSING_XML);

      expect(result.vlans).toHaveLength(4);
      expect(result.vlans.map((v) => v.id)).toEqual([1, 10, 20, 30]);
      expect(result.vlans[0]).toEqual({ id: 1, name: "default", state: "" });
      expect(result.vlans[1]).toEqual({ id: 10, name: "DOCENTES", state: "" });
      expect(result.vlans[2]).toEqual({ id: 20, name: "ESTUDIANTES", state: "" });
      expect(result.vlans[3]).toEqual({ id: 30, name: "EDUROAM", state: "" });
    });

    it("Switch con VLANs self-closing preserva todas", () => {
      const result = parseDeviceXml(SWITCH_SELFCLOSING_XML);

      expect(result.vlans).toHaveLength(4);
      expect(result.vlans.map((v) => v.id)).toEqual([1, 10, 20, 99]);
      expect(result.vlans[2]).toEqual({ id: 20, name: "VOICE", state: "" });
    });
  });
});
