// ============================================================================
// Parser Generator - Generates JavaScript parser code for PT runtime
// ============================================================================
// This is the SINGLE SOURCE OF TRUTH for runtime parsers.
// The TypeScript version in ios-parsers.ts is converted to JavaScript here.

/**
 * Generates the IOS_PARSERS JavaScript object for the runtime.
 * This replaces the inline parser code in compose.ts.
 */
export function generateParserCode(): string {
  return `var IOS_PARSERS = {
  "show ip interface brief": function(output) {
    var interfaces = [];
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var match = line.match(/^(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)$/);
      if (match && match[1] !== "Interface") {
        interfaces.push({
          interface: match[1],
          ipAddress: match[2],
          ok: match[3],
          method: match[4],
          status: match[5],
          protocol: match[6]
        });
      }
    }
    return { raw: output, interfaces: interfaces };
  },

  "show vlan brief": function(output) {
    var vlans = [];
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var match = line.match(/^(\\d+)\\s+(\\S+)\\s+(\\S+)\\s*(.*?)$/);
      if (match) {
        var ports = match[4] ? match[4].split(",").map(function(p) { return p.trim(); }).filter(function(p) { return p; }) : [];
        vlans.push({ id: parseInt(match[1]), name: match[2], status: match[3], ports: ports });
      }
    }
    return { raw: output, vlans: vlans };
  },

  "show vlan": function(output) {
    return IOS_PARSERS["show vlan brief"](output);
  },

  "show ip route": function(output) {
    var routes = [];
    var gatewayOfLastResort = null;
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var gwMatch = line.match(/Gateway of last resort is (.+)/i);
      if (gwMatch) {
        gatewayOfLastResort = gwMatch[1];
        continue;
      }
      var routeMatch = line.match(/^([CLSORDBEIUM*])\\s+(\\S+)\\s+(?:is\\s+)?(.+)$/);
      if (routeMatch) {
        var route = { type: routeMatch[1], network: routeMatch[2], nextHop: null, interface: null };
        var rest = routeMatch[3];
        if (rest.indexOf("directly connected") >= 0) {
          var ifaceMatch = rest.match(/connected,\\s*(\\S+)/);
          if (ifaceMatch) route.interface = ifaceMatch[1];
        } else if (rest.indexOf("via") >= 0) {
          var viaMatch = rest.match(/via\\s+(\\S+)/);
          if (viaMatch) route.nextHop = viaMatch[1].replace(",", "");
        }
        routes.push(route);
      }
    }
    return { raw: output, routes: routes, gatewayOfLastResort: gatewayOfLastResort };
  },

  "show running-config": function(output) {
    var sections = {};
    var interfaces = {};
    var currentSection = null;
    var currentContent = [];
    var hostname = null;
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.startsWith("hostname ")) hostname = line.substring(9).trim();
      if (line === "!") {
        if (currentSection) sections[currentSection] = currentContent.join("\\n");
        currentSection = null;
        currentContent = [];
      } else if (line.startsWith("interface ")) {
        currentSection = line.trim();
        currentContent.push(line);
        interfaces[line.substring(10).trim()] = "";
      } else if (line.startsWith("vlan ") || line.startsWith("router ")) {
        currentSection = line.trim();
        currentContent.push(line);
      } else if (currentSection) {
        currentContent.push(line);
      }
    }
    return { raw: output, hostname: hostname, sections: sections, interfaces: interfaces };
  },

  "show interfaces": function(output) {
    var interfaces = [];
    var current = null;
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var ifaceMatch = line.match(/^(\\S+)\\s+is\\s+(\\S+),\\s+line protocol is (\\S+)/);
      if (ifaceMatch) {
        if (current) interfaces.push(current);
        current = { name: ifaceMatch[1], status: ifaceMatch[2], protocol: ifaceMatch[3] };
      }
      if (current) {
        if (line.startsWith("  Hardware is ")) current.hardware = line.substring(14).trim();
        if (line.startsWith("  Description: ")) current.description = line.substring(15).trim();
        if (line.startsWith("  Internet address is ")) {
          var ipMatch = line.match(/Internet address is (\\S+)/);
          if (ipMatch) {
            var parts = ipMatch[1].split("/");
            current.ipAddress = parts[0];
            if (parts[1]) current.cidr = parseInt(parts[1]);
          }
        }
      }
    }
    if (current) interfaces.push(current);
    return { raw: output, interfaces: interfaces };
  },

  "show ip arp": function(output) {
    var entries = [];
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var match = line.match(/^(Internet)\\s+(\\S+)\\s+(\\S+)\\s+([0-9a-fA-F.]+)\\s+(\\S+)\\s+(\\S+)$/i);
      if (match) {
        entries.push({ protocol: match[1], address: match[2], age: match[3], mac: match[4], type: match[5], interface: match[6] });
      }
    }
    return { raw: output, entries: entries };
  },

  "show mac address-table": function(output) {
    var entries = [];
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var match = line.match(/^(\\S+)\\s+([0-9a-fA-F.]+)\\s+(\\S+)\\s+(\\S+)$/);
      if (match) {
        entries.push({ vlan: match[1], macAddress: match[2], type: match[3].toLowerCase(), ports: [match[4]] });
      }
    }
    return { raw: output, entries: entries };
  },

  "show spanning-tree": function(output) {
    var vlans = [];
    var current = null;
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var vlanMatch = line.match(/^VLAN(\\d+)/);
      if (vlanMatch) {
        if (current) vlans.push(current);
        current = { vlan: parseInt(vlanMatch[1]), interfaces: [] };
      }
      if (current) {
        if (line.startsWith("  Root ID")) current.rootBridgeId = line.substring(10).trim();
        if (line.startsWith("  Bridge ID")) current.bridgeId = line.substring(12).trim();
        var ifaceMatch = line.match(/^\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+(\\d+)\\s+(\\S+)/);
        if (ifaceMatch) {
          current.interfaces.push({ port: ifaceMatch[1], role: ifaceMatch[2].toLowerCase(), state: ifaceMatch[3].toLowerCase(), cost: parseInt(ifaceMatch[4]) });
        }
      }
    }
    if (current) vlans.push(current);
    return { raw: output, vlans: vlans };
  },

  "show version": function(output) {
    var result = { raw: output };
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.includes("Version ")) {
        var vMatch = line.match(/Version (\\S+)/);
        if (vMatch) result.version = vMatch[1];
      }
      if (line.includes(" uptime is ")) result.uptime = line.substring(line.indexOf(" uptime is ") + 11);
      var uptimeMatch = line.match(/^(\\S+)\\s+uptime is /);
      if (uptimeMatch) result.hostname = uptimeMatch[1];
    }
    return result;
  },

  "show cdp neighbors": function(output) {
    var neighbors = [];
    var started = false;
    var lines = output.split("\\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.includes("Device ID")) { started = true; continue; }
      if (!started || !line) continue;
      var parts = line.split(/\\s+/);
      if (parts.length >= 6) {
        neighbors.push({ deviceId: parts[0], localInterface: parts[1], holdtime: parseInt(parts[2]), capability: parts[3], platform: parts[4], portId: parts[5] });
      }
    }
    return { raw: output, neighbors: neighbors };
  }
};

function __getParser(command) {
  var cmd = command.toLowerCase().trim();
  if (IOS_PARSERS[cmd]) return IOS_PARSERS[cmd];
  for (var key in IOS_PARSERS) {
    if (cmd.startsWith(key.toLowerCase())) return IOS_PARSERS[key];
  }
  return null;
}`;
}
