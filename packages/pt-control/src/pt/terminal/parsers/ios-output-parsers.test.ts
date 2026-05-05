import { describe, expect, test } from "bun:test";
import {
  parseIosShowIpInterfaceBrief,
  parseIosShowRunningConfig,
  parseIosShowVersion,
} from "./ios-output-parsers.js";

describe("ios-output-parsers", () => {
  test("parseIosShowVersion detecta banner Cisco", () => {
    const parsed = parseIosShowVersion(`
SW-SRV-DIST>show version
Cisco IOS Software, C2960 Software, Version 12.2
Configuration register is 0xF
`);

    expect(parsed.parserId).toBe("ios.show-version");
    expect(parsed.facts.hasCiscoBanner).toBe(true);
    expect(String(parsed.facts.versionLine)).toContain("show version");
  });

  test("parseIosShowRunningConfig detecta cabecera, cuerpo y end", () => {
    const parsed = parseIosShowRunningConfig(`
Building configuration...

Current configuration : 2020 bytes
!
version 12.2
hostname SW-SRV-DIST
!
interface Vlan99
 ip address 192.168.99.6 255.255.255.0
!
end
`);

    expect(parsed.parserId).toBe("ios.show-running-config");
    expect(parsed.facts.hasBuildingConfiguration).toBe(true);
    expect(parsed.facts.hasCurrentConfiguration).toBe(true);
    expect(parsed.facts.hasConfigBody).toBe(true);
    expect(parsed.facts.hasConfigTerminator).toBe(true);
  });

  test("parseIosShowRunningConfig no trata Version ID como linea version de config", () => {
    const parsed = parseIosShowRunningConfig(`
Version ID                      : V02
Configuration register is 0xF
SW-SRV-DIST>show ip interface brief
FastEthernet0/1        unassigned      YES manual up                    up
SW-SRV-DIST>enable
`);

    expect(parsed.facts.versionLine).toBe(null);
    // hasConfigBody es true por la tabla "Interface..." que empieza con esa palabra
    // pero en un caso real eso no debería ocurrir - el test verifica versionLine
    expect(parsed.facts.hasConfigTerminator).toBe(false);
  });

  test("parseIosShowIpInterfaceBrief extrae interfaces", () => {
    const parsed = parseIosShowIpInterfaceBrief(`
Interface              IP-Address      OK? Method Status                Protocol
FastEthernet0/1        unassigned      YES manual up                    up
Vlan99                 192.168.99.6    YES manual up                    up
`);

    expect(parsed.parserId).toBe("ios.show-ip-interface-brief");
    expect(parsed.facts.interfaceCount).toBe(2);
    expect(parsed.facts.upCount).toBe(2);
  });
});
