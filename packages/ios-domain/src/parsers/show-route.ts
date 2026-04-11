import type { ShowIpRoute } from "@cisco-auto/types";

/**
 * Parse "show ip route" output
 */
export function parseShowIpRoute(output: string): ShowIpRoute {
  const lines = output.split("\n");
  const routes: ShowIpRoute["routes"] = [];
  let gatewayOfLastResort: string | undefined;

  // Route type legend
  const typeMap: Record<string, ShowIpRoute["routes"][0]["type"]> = {
    C: "C", L: "L", S: "S", R: "R", O: "O", D: "D", B: "B", E: "E", I: "I", M: "M", U: "U", "*": "*",
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Gateway of last resort
    const gwMatch = trimmed.match(/Gateway of last resort is (.+)/i);
    if (gwMatch) {
      gatewayOfLastResort = gwMatch[1];
      continue;
    }

    // Route entry
    // Examples:
    // C    192.168.1.0/24 is directly connected, GigabitEthernet0/0
    // S    0.0.0.0/0 [1/0] via 192.168.1.1
    // O IA 10.0.2.0/24 [110/2] via 192.168.1.1
    // D EX 10.0.3.0/24 [170/2816] via 192.168.1.2
    const routeMatch = trimmed.match(/^([A-Z*](?:\s+[A-Z*]+)?)\s+(\S+)(?:\s+\[(\d+)\/(\d+)\])?\s*(.*)/);
    
    if (routeMatch) {
      const typeChar = routeMatch[1]!.trim();
      const network = routeMatch[2]!;
      if (network === "-") continue;
      const adminDist = routeMatch[3] ? parseInt(routeMatch[3], 10) : undefined;
      const metric = routeMatch[4] ? parseInt(routeMatch[4], 10) : undefined;
      const rest = routeMatch[5] || "";

      const route: ShowIpRoute["routes"][0] = {
        type: typeMap[typeChar.split(/\s+/)[0]!] || "C",
        network,
        administrativeDistance: adminDist,
        metric,
        nextHop: undefined,
        interface: undefined,
      };

      // Parse rest
      if (rest.includes("directly connected")) {
        const ifaceMatch = rest.match(/connected,?\s*(\S+)/);
        if (ifaceMatch) {
          route.interface = ifaceMatch[1];
        }
      } else if (rest.includes("via")) {
        const viaMatch = rest.match(/via\s+(\S+)/);
        if (viaMatch) {
          route.nextHop = viaMatch[1]!.replace(",", "");
        }

        // Interface after comma
        const ifaceMatch = rest.match(/,\s*(\S+)/);
        if (ifaceMatch) {
          route.interface = ifaceMatch[1];
        }
      }

      routes.push(route);
    }
  }

  return { raw: output, routes, gatewayOfLastResort };
}