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