import { describe, test, expect } from "bun:test";
import { parseShowIpInterfaceBrief } from "./show-interface";

describe("parseShowIpInterfaceBrief", () => {
  test("parses basic interface brief output", () => {
    const output = `
      Interface              IP-Address      OK? Method Status                Protocol
      GigabitEthernet0/0     192.168.1.1     YES manual up                    up
      GigabitEthernet0/1     unassigned      YES unset  administratively down down
      Serial0/0/0            10.0.0.1        YES manual up                    up
      Vlan1                  192.168.10.1    YES manual up                    up
      Loopback0              10.0.0.1        YES manual up                    up
    `;

    const result = parseShowIpInterfaceBrief(output);

    expect(result.interfaces).toHaveLength(5);
    
    // Check first interface
    expect(result.interfaces[0]).toEqual({
      interface: "GigabitEthernet0/0",
      ipAddress: "192.168.1.1",
      ok: "YES",
      method: "manual",
      status: "up",
      protocol: "up"
    });
    
    // Check administratively down interface
    expect(result.interfaces[1]).toEqual({
      interface: "GigabitEthernet0/1",
      ipAddress: "unassigned",
      ok: "YES",
      method: "unset",
      status: "administratively down",
      protocol: "down"
    });
    
    // Check serial interface
    expect(result.interfaces[2]).toEqual({
      interface: "Serial0/0/0",
      ipAddress: "10.0.0.1",
      ok: "YES",
      method: "manual",
      status: "up",
      protocol: "up"
    });
  });

  test("handles empty output", () => {
    const output = `
      Interface              IP-Address      OK? Method Status                Protocol
    `;

    const result = parseShowIpInterfaceBrief(output);
    expect(result.interfaces).toHaveLength(0);
  });

  test("filters out header line", () => {
    const output = `
      Interface              IP-Address      OK? Method Status                Protocol
      GigabitEthernet0/0     192.168.1.1     YES manual up                    up
      Interface              IP-Address      OK? Method Status                Protocol
      GigabitEthernet0/1     192.168.1.2     YES manual up                    down
    `;

    const result = parseShowIpInterfaceBrief(output);
    expect(result.interfaces).toHaveLength(2); // Should not include the header line
    expect(result.interfaces[0].interface).toBe("GigabitEthernet0/0");
    expect(result.interfaces[1].interface).toBe("GigabitEthernet0/1");
  });
});