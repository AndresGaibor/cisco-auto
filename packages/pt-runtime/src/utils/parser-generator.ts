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
    var entries = [];
    var warnings = [];
    var lines = (output||"").split("\\n").map(function(l){ return l.replace(/\\r/g, ""); }).filter(function(l){ return l.trim().length > 0; });
    if (lines.length === 0) return { entries: [], warnings: ["Empty output"] };

    // Heuristic: find header line within the first few lines
    var headerIdx = -1;
    for (var i = 0; i < Math.min(6, lines.length); i++) {
      var low = lines[i].toLowerCase();
      if (low.indexOf('interface') !== -1 && (low.indexOf('ip') !== -1 || low.indexOf('ip-address') !== -1) && (low.indexOf('protocol') !== -1 || low.indexOf('status') !== -1)) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) headerIdx = 0;

    var header = lines[headerIdx] || "";
    var headerTokens = header.trim().split(/\s{2,}|\t/).map(function(t){ return t.trim().toLowerCase(); }).filter(function(t){ return t; });
    var col = {};
    for (var i = 0; i < headerTokens.length; i++) {
      var t = headerTokens[i];
      if (t.indexOf('interface') !== -1) col.iface = i;
      else if (t.indexOf('ip') !== -1 || t.indexOf('ip-address') !== -1) col.ip = i;
      else if (t === 'ok?' || t.indexOf('ok') !== -1) col.ok = i;
      else if (t.indexOf('method') !== -1) col.method = i;
      else if (t.indexOf('status') !== -1) col.status = i;
      else if (t.indexOf('protocol') !== -1) col.protocol = i;
    }

    for (var i = headerIdx + 1; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln || ln.indexOf('---') >= 0) continue;
      var toks = ln.trim().split(/\s{2,}|\t/).map(function(t){ return t.trim(); }).filter(function(t){ return t; });
      if (toks.length < 2) toks = ln.trim().split(/\s+/);
      if (toks.length === 0) continue;
      var name = (typeof col.iface !== 'undefined') ? (toks[col.iface] || toks[0]) : toks[0];
      var ip = (typeof col.ip !== 'undefined') ? (toks[col.ip] || 'unassigned') : (toks[1] || 'unassigned');
      var status = (typeof col.status !== 'undefined') ? toks[col.status] : (toks.length >= 4 ? toks[3] : '');
      var protocol = (typeof col.protocol !== 'undefined') ? toks[col.protocol] : toks[toks.length - 1];
      entries.push({ interface: name, ipAddress: ip, status: status, protocol: protocol, raw: ln });
    }

    if (entries.length === 0) warnings.push('No interfaces parsed - output format may have changed');
    return { entries: entries, warnings: warnings };
  },

  "show vlan brief": function(output) {
    var vlans = [];
    var warnings = [];
    var lines = (output||"").split("\\n").map(function(l){ return l.replace(/\\r/g, ""); }).filter(function(l){ return l.trim().length > 0; });
    if (lines.length === 0) return { entries: [], warnings: ["Empty output"] };

    // locate header line heuristically
    var headerIdx = -1;
    for (var i = 0; i < Math.min(6, lines.length); i++) {
      var low = lines[i].toLowerCase();
      if (low.indexOf('vlan') !== -1 && low.indexOf('name') !== -1) { headerIdx = i; break; }
    }
    if (headerIdx === -1) headerIdx = 0;
    var header = lines[headerIdx] || "";
    var headerTokens = header.trim().split(/\s{2,}|\t/).map(function(t){ return t.trim().toLowerCase(); }).filter(function(t){ return t; });
    var col = {};
    for (var i = 0; i < headerTokens.length; i++) {
      var t = headerTokens[i];
      if (t.indexOf('vlan') !== -1) col.id = i;
      else if (t.indexOf('name') !== -1) col.name = i;
      else if (t.indexOf('status') !== -1) col.status = i;
      else if (t.indexOf('ports') !== -1 || t.indexOf('port') !== -1) col.ports = i;
    }

    for (var i = headerIdx + 1; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln || ln.indexOf('---') >= 0) continue;
      var toks = ln.trim().split(/\s{2,}|\t/).map(function(t){ return t.trim(); }).filter(function(t){ return t; });
      if (toks.length === 0) continue;
      // fallback: try whitespace split if columns compressed
      if (toks.length < 3) toks = ln.trim().split(/\s+/);
      var id = parseInt(toks[col.id] || toks[0]);
      if (isNaN(id)) { warnings.push('Failed to parse VLAN id for line: ' + ln); continue; }
      var name = toks[col.name] || (toks[1] || '');
      var status = toks[col.status] || '';
      var portsRaw = (typeof col.ports !== 'undefined') ? (toks[col.ports] || '') : toks.slice(3).join(' ');
      var ports = portsRaw ? portsRaw.split(/[,\s]+/).map(function(p){ return p.trim(); }).filter(function(p){ return p; }) : [];
      vlans.push({ id: id, name: name, status: status, ports: ports, raw: ln });
    }
    if (vlans.length === 0) warnings.push('No VLANs parsed - output format may have changed');
    return { entries: vlans, warnings: warnings };
  },

  "show vlan": function(output) { return IOS_PARSERS['show vlan brief'](output); },

  "show ip route": function(output) {
    var routes = []; var gatewayOfLastResort = null; var warnings = [];
    var lines = (output||"").split("\\n").map(function(l){ return l.replace(/\\r/g, ""); }).filter(function(l){ return l.trim().length > 0; });
    if (lines.length === 0) return { entries: [], warnings: ["Empty output"] };

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      var gwMatch = ln.match(/Gateway of last resort is (.+)/i);
      if (gwMatch) { gatewayOfLastResort = gwMatch[1]; continue; }

      // Try common route line patterns
      var routeMatch = ln.match(/^([A-Z\*])\s+(\S+)\s+(.*)$/i);
      if (routeMatch) {
        var type = routeMatch[1]; var network = routeMatch[2]; var rest = routeMatch[3] || '';
        var nextHop = null; var intf = null;
        var viaMatch = rest.match(/via\s+(\S+)/i); if (viaMatch) nextHop = viaMatch[1].replace(',','');
        var connMatch = rest.match(/connected,?\s*(\S+)/i) || rest.match(/directly connected,?\s*(\S+)/i); if (connMatch) intf = connMatch[1];
        routes.push({ type: type, network: network, nextHop: nextHop, interface: intf, raw: ln });
        continue;
      }

      var ipRoute = ln.match(/^ip route\s+(\S+)\s+(\S+)\s+via\s+(\S+)/i);
      if (ipRoute) { routes.push({ type: 'S', network: ipRoute[1] + '/' + ipRoute[2], nextHop: ipRoute[3], raw: ln }); continue; }

      // not matched: add as warning but continue
      warnings.push('Unrecognized route line: ' + ln);
    }
    return { entries: routes, gatewayOfLastResort: gatewayOfLastResort, warnings: warnings };
  },

  "show running-config": function(output) {
    var hostname = null;
    var interfaces = {};
    var vlans = [];
    var staticRoutes = [];
    var lines = (output||"").split("\\n").map(function(l){ return l.replace(/\\r/g, ""); });
    if (lines.length === 0) return { entries: {}, warnings: ["Empty output"] };

    var currentIface = null;
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!raw) continue;
      var line = raw.trim();
      if (!line) { currentIface = null; continue; }
      if (line.startsWith('hostname ')) { hostname = line.substring(9).trim(); continue; }
      if (line.startsWith('interface ')) { currentIface = line.substring(10).trim(); interfaces[currentIface] = { commands: [] }; continue; }
      if (line === '!') { currentIface = null; continue; }
      if (currentIface) { interfaces[currentIface].commands.push(line); continue; }
      var vlanMatch = line.match(/^vlan\s+(\d+)/i);
      if (vlanMatch) { var vid = parseInt(vlanMatch[1]); var name = null; // look ahead for name
        var j = i + 1; while (j < lines.length && lines[j].startsWith(' ')) { var l2 = lines[j].trim(); var nm = l2.match(/^name\s+(.*)/i); if (nm) { name = nm[1].trim(); break; } j++; } vlans.push({ id: vid, name: name }); continue; }
      var ipr = line.match(/^ip route\s+(\S+)\s+(\S+)\s+(\S+)/i);
      if (ipr) { staticRoutes.push({ network: ipr[1], mask: ipr[2], nextHop: ipr[3], raw: line }); continue; }
    }
    var warnings = []; if (!hostname) warnings.push('hostname not found in running-config');
    return { entries: { hostname: hostname, interfaces: interfaces, vlans: vlans, staticRoutes: staticRoutes }, warnings: warnings };
  },

  "show interfaces": function(output) {
    var interfaces = []; var warnings = [];
    var lines = (output||"").split("\\n").map(function(l){ return l.replace(/\\r/g, ""); }).filter(function(l){ return l.trim().length > 0; });
    if (lines.length === 0) return { entries: [], warnings: ["Empty output"] };
    var current = null;
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var m = raw.match(/^(\S+)\s+is\s+(\S+),\s+line protocol is\s+(\S+)/i);
      if (m) { if (current) interfaces.push(current); current = { name: m[1], status: m[2], protocol: m[3], raw: raw, details: [] }; continue; }
      if (current) { var t = raw.trim(); if (t.startsWith('Hardware is')) current.hardware = t.substring(12).trim(); else if (t.indexOf('Description') === 0) current.description = t.substring('Description'.length).trim(); else if (t.indexOf('Internet address is') >= 0) { var ipm = t.match(/Internet address is\s+(\S+)/i); if (ipm) { var parts = ipm[1].split('/'); current.ipAddress = parts[0]; if (parts[1]) current.cidr = parseInt(parts[1]); } } else { current.details.push(t); } }
    }
    if (current) interfaces.push(current);
    return { entries: interfaces, warnings: warnings };
  },

  "show cdp neighbors": function(output) {
    var neighbors = []; var warnings = [];
    var lines = (output||"").split("\\n").map(function(l){ return l.replace(/\\r/g, ""); }).filter(function(l){ return l.trim().length > 0; });
    if (lines.length === 0) return { entries: [], warnings: ["Empty output"] };
    var started = false;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (ln.indexOf('---') >= 0) continue;
      if (ln.indexOf('Device ID') >= 0) { started = true; continue; }
      if (!started || !ln) continue;
      var parts = ln.split(/\s+/);
      if (parts.length >= 6) { neighbors.push({ deviceId: parts[0], localInterface: parts[1], holdtime: parseInt(parts[2]) || 0, capability: parts[3], platform: parts[4], portId: parts[5], raw: ln }); }
    }
    return { entries: neighbors, warnings: warnings };
  }

};

function __getParser(command) {
  var cmd = command.toLowerCase().trim();
  if (IOS_PARSERS[cmd]) return IOS_PARSERS[cmd];
  for (var key in IOS_PARSERS) {
    if (cmd.startsWith(key.toLowerCase())) return IOS_PARSERS[key];
  }
  return null;
}

// expose helper for runtime (optional)

// Try to expose __getParser globally (optional, may not work in all PT versions)
`;}