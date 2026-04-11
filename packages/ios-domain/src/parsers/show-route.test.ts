import { describe, test, expect } from "bun:test";
import { parseShowIpRoute } from "./show-route";

describe("parseShowIpRoute", () => {
  test("parses basic route output", () => {
    const output = `
      Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
             D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
             N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
             E1 - OSPF external type 1, E2 - OSPF external type 2
             i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
             ia - IS-IS inter area, * - candidate default, U - per-user static route
             o - ODR, P - periodic downloaded static route, + - replicated route

      Gateway of last resort is 192.168.1.1 to network 0.0.0.0

      C    192.168.1.0/24 is directly connected, GigabitEthernet0/0
      S    0.0.0.0/0 [1/0] via 192.168.1.1
      O IA 10.0.2.0/24 [110/2] via 192.168.1.1
      D EX 10.0.3.0/24 [170/2816] via 192.168.1.2
      C    10.0.0.0/30 is directly connected, Serial0/0/0
    `;

    const result = parseShowIpRoute(output);

    expect(result.gatewayOfLastResort).toBe("192.168.1.1 to network 0.0.0.0");
    expect(result.routes).toHaveLength(4);

    // Check connected route
    expect(result.routes[0]).toEqual({
      type: "C",
      network: "192.168.1.0/24",
      administrativeDistance: undefined,
      metric: undefined,
      nextHop: undefined,
      interface: "GigabitEthernet0/0"
    });

    // Check static route
    expect(result.routes[1]).toEqual({
      type: "S",
      network: "0.0.0.0/0",
      administrativeDistance: 1,
      metric: 0,
      nextHop: "192.168.1.1",
      interface: undefined
    });

    // Check OSPF inter area route
    expect(result.routes[2]).toEqual({
      type: "O",
      network: "10.0.2.0/24",
      administrativeDistance: 110,
      metric: 2,
      nextHop: "192.168.1.1",
      interface: undefined
    });

    // Check EIGRP external route
    expect(result.routes[3]).toEqual({
      type: "D",
      network: "10.0.3.0/24",
      administrativeDistance: 170,
      metric: 2816,
      nextHop: "192.168.1.2",
      interface: undefined
    });
  });

  test("handles empty output", () => {
    const output = `
      Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
             D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
             N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
             E1 - OSPF external type 1, E2 - OSPF external type 2
             i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
             ia - IS-IS inter area, * - candidate default, U - per-user static route
             o - ODR, P - periodic downloaded static route, + - replicated route
    `;

    const result = parseShowIpRoute(output);
    expect(result.routes).toHaveLength(0);
    expect(result.gatewayOfLastResort).toBeUndefined();
  });

  test("parses route with age field", () => {
    const output = `
      Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
             D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
             N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
             E1 - OSPF external type 1, E2 - OSPF external type 2
             i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
             ia - IS-IS inter area, * - candidate default, U - per-user static route
             o - ODR, P - periodic downloaded static route, + - replicated route

      O    10.1.1.0/24 [110/2] via 192.168.1.1, 00:00:20, Serial0/0/0
    `;

    const result = parseShowIpRoute(output);
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toEqual({
      type: "O",
      network: "10.1.1.0/24",
      administrativeDistance: 110,
      metric: 2,
      nextHop: "192.168.1.1",
      interface: "Serial0/0/0"
    });
  });
});