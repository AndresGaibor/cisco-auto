import { describe, test, expect } from "bun:test";
import { parseShowRun } from "./show-run";

describe("parseShowRun", () => {
  test("parses basic running config", () => {
    const output = `
      Building configuration...

      Current configuration : 1234 bytes
      !
      version 15.2
      service timestamps debug datetime msec
      service timestamps log datetime msec
      no service password-encryption
      !
      hostname Router
      !
      boot-start-marker
      boot-end-marker
      !
      !
      no aaa new-model
      !
      !
      !
      ip cef
      !
      !
      !
      interface GigabitEthernet0/0
       ip address 192.168.1.1 255.255.255.0
       duplex auto
       speed auto
      !
      interface GigabitEthernet0/1
       no ip address
       shutdown
      !
      interface Serial0/0/0
       ip address 10.0.0.1 255.255.255.252
       encapsulation hdlc
      !
      !
      router ospf 1
       network 192.168.1.0 0.0.0.255 area 0
       network 10.0.0.0 0.0.0.3 area 0
      !
      !
      ip forward-protocol nd
      !
      !
      ip http server
      ip http authentication local
      ip http secure-server
      !
      !
      control-plane
      !
      !
      line con 0
       exec-timeout 0 0
       privilege level 15
       logging synchronous
      line aux 0
      line 2
       no activation-character
       no exec
      transport preferred none
      transport input all
      transport output lat pad telnet rlogin lapb
      transport output lat pad telnet rlogin lapb
      !
      scheduler allocate 20000 1000
      !
      end
    `;

    const result = parseShowRun(output);

    expect(result.hostname).toBe("Router");
    expect(result.version).toBe("15.2");
    expect(result.lines).toContain("version 15.2");
    expect(result.lines).toContain("hostname Router");
    expect(result.sections).toHaveLength(8); // version, hostname, interface Gi0/0, interface Gi0/1, interface Serial0/0/0, router ospf, ip http server, line con 0, line aux 0, line 2, scheduler allocate
    expect(result.interfaces["GigabitEthernet0/0"]).toContain("ip address 192.168.1.1 255.255.255.0");
    expect(result.interfaces["GigabitEthernet0/1"]).toContain("shutdown");
    expect(result.interfaces["Serial0/0/0"]).toContain("encapsulation hdlc");
  });

  test("handles empty config", () => {
    const output = `
      Building configuration...
      !
      end
    `;

    const result = parseShowRun(output);

    expect(result.hostname).toBeUndefined();
    expect(result.version).toBeUndefined();
    expect(result.sections).toHaveLength(0);
    expect(result.interfaces).toEqual({});
  });

  test("parses config with VLANs", () => {
    const output = `
      Building configuration...
      !
      version 12.4
      hostname Switch
      !
      vlan 10
       name Sales
      !
      vlan 20
       name Engineering
      !
      interface FastEthernet0/1
       switchport mode access
       switchport access vlan 10
      !
      interface FastEthernet0/2
       switchport mode access
       switchport access vlan 20
      !
      end
    `;

    const result = parseShowRun(output);

    expect(result.hostname).toBe("Switch");
    expect(result.version).toBe("12.4");
    expect(result.sections).toContainEqual(expect.objectContaining({
      section: "vlan 10",
      content: "vlan 10\n       name Sales"
    }));
    expect(result.sections).toContainEqual(expect.objectContaining({
      section: "vlan 20",
      content: "vlan 20\n       name Engineering"
    }));
    expect(result.interfaces["FastEthernet0/1"]).toContain("switchport access vlan 10");
    expect(result.interfaces["FastEthernet0/2"]).toContain("switchport access vlan 20");
  });
});