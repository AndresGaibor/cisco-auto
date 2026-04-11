import { describe, test, expect } from "bun:test";
import { parseShowCdpNeighbors } from "./show-cdp";

describe("parseShowCdpNeighbors", () => {
  test("parses basic CDP neighbors output", () => {
    const output = `
      Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge
                      S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone

      Device ID        Local Intrfce     Holdtme    Capability  Platform      Port ID
      Switch1          Gig 0/1           152        R S I       WS-C2960-24TT-L Gig 0/2
      Router2          Ser 0/0/0         145        R           C2900         Ser 0/0/1
      Phone3           Fas 0/3           172        H           CP-7960G      Port 1
    `;

    const result = parseShowCdpNeighbors(output);

    expect(result.neighbors).toHaveLength(3);
    
    // Check first neighbor (switch)
    expect(result.neighbors[0]).toEqual({
      deviceId: "Switch1",
      localInterface: "Gig 0/1",
      holdtime: 152,
      capability: "R S I",
      platform: "WS-C2960-24TT-L",
      portId: "Gig 0/2"
    });

    // Check second neighbor (router)
    // Note: Port ID column starts at ~73, so Router2's Ser 0/0/1 fits in the last column
    expect(result.neighbors[1]).toEqual({
      deviceId: "Router2",
      localInterface: "Ser 0/0/0",
      holdtime: 145,
      capability: "R",
      platform: "C2900",
      portId: "Ser 0/0/1"
    });
    
    // Check third neighbor (phone)
    expect(result.neighbors[2]).toEqual({
      deviceId: "Phone3",
      localInterface: "Fas 0/3",
      holdtime: 172,
      capability: "H",
      platform: "CP-7960G",
      portId: "Port 1"
    });
  });

  test("handles empty CDP output", () => {
    const output = `
      Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge
                      S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone

      Device ID        Local Intrfce     Holdtme    Capability  Platform      Port ID
    `;

    const result = parseShowCdpNeighbors(output);
    expect(result.neighbors).toHaveLength(0);
  });

  test("filters out header line", () => {
    const output = `
      Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge
                      S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone

      Device ID        Local Intrfce     Holdtme    Capability  Platform      Port ID
      Switch1          Gig 0/1           152        R S I       WS-C2960-24TT-L Gig 0/2
      Device ID        Local Intrfce     Holdtme    Capability  Platform      Port ID
      Router2          Ser 0/0/0         145        R           C2900         Ser 0/0/1
    `;

    const result = parseShowCdpNeighbors(output);
    expect(result.neighbors).toHaveLength(2); // Should not include the header line
    expect(result.neighbors[0].deviceId).toBe("Switch1");
    expect(result.neighbors[1].deviceId).toBe("Router2");
  });
});