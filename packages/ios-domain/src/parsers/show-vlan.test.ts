import { describe, test, expect } from "bun:test";
import { parseShowVlan } from "./show-vlan";

describe("parseShowVlan", () => {
  test("parses basic VLAN output", () => {
    const output = `
      VLAN Name                             Status    Ports
      ---- -------------------------------- --------- -------------------------------
      1    default                          active    Fa0/1, Fa0/2, Fa0/3, Fa0/4
      10   Sales                            active    Fa0/5, Fa0/6
      20   Engineering                      active    Fa0/7, Fa0/8
      30   suspended                        suspended
      999  test_vlan                        act/unsup Fa0/9
    `;

    const result = parseShowVlan(output);

    expect(result.vlans).toHaveLength(5);
    
    // Check default VLAN
    expect(result.vlans[0]).toEqual({
      id: 1,
      name: "default",
      status: "active",
      ports: ["Fa0/1", "Fa0/2", "Fa0/3", "Fa0/4"]
    });
    
    // Check Sales VLAN
    expect(result.vlans[1]).toEqual({
      id: 10,
      name: "Sales",
      status: "active",
      ports: ["Fa0/5", "Fa0/6"]
    });
    
    // Check Engineering VLAN
    expect(result.vlans[2]).toEqual({
      id: 20,
      name: "Engineering",
      status: "active",
      ports: ["Fa0/7", "Fa0/8"]
    });
    
    // Check suspended VLAN
    expect(result.vlans[3]).toEqual({
      id: 30,
      name: "suspended",
      status: "suspended",
      ports: []
    });
    
    // Check act/unsup VLAN
    expect(result.vlans[4]).toEqual({
      id: 999,
      name: "test_vlan",
      status: "act/unsup",
      ports: ["Fa0/9"]
    });
  });

  test("handles VLANs with continuation lines", () => {
    const output = `
      VLAN Name                             Status    Ports
      ---- -------------------------------- --------- -------------------------------
      10   Sales                            active    Fa0/5, Fa0/6
                                               Fa0/7, Fa0/8
      20   Engineering                      active    Fa0/9
                                               Fa0/10, Fa0/11
                                               Fa0/12
    `;

    const result = parseShowVlan(output);

    expect(result.vlans).toHaveLength(2);
    
    // Check Sales VLAN with continuation
    expect(result.vlans[0]).toEqual({
      id: 10,
      name: "Sales",
      status: "active",
      ports: ["Fa0/5", "Fa0/6", "Fa0/7", "Fa0/8"]
    });
    
    // Check Engineering VLAN with continuation
    expect(result.vlans[1]).toEqual({
      id: 20,
      name: "Engineering",
      status: "active",
      ports: ["Fa0/9", "Fa0/10", "Fa0/11", "Fa0/12"]
    });
  });

  test("filters out header lines", () => {
    const output = `
      VLAN Name                             Status    Ports
      ---- -------------------------------- --------- -------------------------------
      1    default                          active    Fa0/1
      VLAN Name                             Status    Ports
      ---- -------------------------------- --------- -------------------------------
      10   Sales                            active    Fa0/2
    `;

    const result = parseShowVlan(output);
    expect(result.vlans).toHaveLength(2); // Should not include the header line
    expect(result.vlans[0].id).toBe(1);
    expect(result.vlans[1].id).toBe(10);
  });

  test("handles empty VLAN output", () => {
    const output = `
      VLAN Name                             Status    Ports
      ---- -------------------------------- --------- -------------------------------
    `;

    const result = parseShowVlan(output);
    expect(result.vlans).toHaveLength(0);
  });
});