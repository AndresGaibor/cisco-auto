# native exec specific fix validation

Fecha: Tue Apr 28 17:17:19 -05 2026

## grep forbidden methods in native handler
```
packages/pt-runtime/src/handlers/terminal-native-exec.ts:34:function startsWithText(value: unknown, prefix: string): boolean {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:39:function endsWithText(value: unknown, suffix: string): boolean {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:219:    startsWithText(text, cmd + "\n") ||
packages/pt-runtime/src/handlers/terminal-native-exec.ts:220:    startsWithText(text, cmd) ||
packages/pt-runtime/dist-qtscript/runtime.js:1974:    return "var IOS_PARSERS = {\n  \"show ip interface brief\": function(output) {\n    var entries = [];\n    var warnings = [];\n    var lines = (output||\"\").split(\"\\n\").map(function(l){ return l.replace(/\\r/g, \"\"); }).filter(function(l){ return l.trim().length > 0; });\n    if (lines.length === 0) return { entries: [], warnings: [\"Empty output\"] };\n\n    // Heuristic: find header line within the first few lines\n    var headerIdx = -1;\n    for (var i = 0; i < Math.min(6, lines.length); i++) {\n      var low = lines[i].toLowerCase();\n      if (low.indexOf('interface') !== -1 && (low.indexOf('ip') !== -1 || low.indexOf('ip-address') !== -1) && (low.indexOf('protocol') !== -1 || low.indexOf('status') !== -1)) {\n        headerIdx = i;\n        break;\n      }\n    }\n    if (headerIdx === -1) headerIdx = 0;\n\n    var header = lines[headerIdx] || \"\";\n    var headerTokens = header.trim().split(/s{2,}|\t/).map(function(t){ return t.trim().toLowerCase(); }).filter(function(t){ return t; });\n    var col = {};\n    for (var i = 0; i < headerTokens.length; i++) {\n      var t = headerTokens[i];\n      if (t.indexOf('interface') !== -1) col.iface = i;\n      else if (t.indexOf('ip') !== -1 || t.indexOf('ip-address') !== -1) col.ip = i;\n      else if (t === 'ok?' || t.indexOf('ok') !== -1) col.ok = i;\n      else if (t.indexOf('method') !== -1) col.method = i;\n      else if (t.indexOf('status') !== -1) col.status = i;\n      else if (t.indexOf('protocol') !== -1) col.protocol = i;\n    }\n\n    for (var i = headerIdx + 1; i < lines.length; i++) {\n      var ln = lines[i];\n      if (!ln || ln.indexOf('---') >= 0) continue;\n      var toks = ln.trim().split(/s{2,}|\t/).map(function(t){ return t.trim(); }).filter(function(t){ return t; });\n      if (toks.length < 2) toks = ln.trim().split(/s+/);\n      if (toks.length === 0) continue;\n      var name = (typeof col.iface !== 'undefined') ? (toks[col.iface] || toks[0]) : toks[0];\n      var ip = (typeof col.ip !== 'undefined') ? (toks[col.ip] || 'unassigned') : (toks[1] || 'unassigned');\n      var status = (typeof col.status !== 'undefined') ? toks[col.status] : (toks.length >= 4 ? toks[3] : '');\n      var protocol = (typeof col.protocol !== 'undefined') ? toks[col.protocol] : toks[toks.length - 1];\n      entries.push({ interface: name, ipAddress: ip, status: status, protocol: protocol, raw: ln });\n    }\n\n    if (entries.length === 0) warnings.push('No interfaces parsed - output format may have changed');\n    return { entries: entries, warnings: warnings };\n  },\n\n  \"show vlan brief\": function(output) {\n    var vlans = [];\n    var warnings = [];\n    var lines = (output||\"\").split(\"\\n\").map(function(l){ return l.replace(/\\r/g, \"\"); }).filter(function(l){ return l.trim().length > 0; });\n    if (lines.length === 0) return { entries: [], warnings: [\"Empty output\"] };\n\n    // locate header line heuristically\n    var headerIdx = -1;\n    for (var i = 0; i < Math.min(6, lines.length); i++) {\n      var low = lines[i].toLowerCase();\n      if (low.indexOf('vlan') !== -1 && low.indexOf('name') !== -1) { headerIdx = i; break; }\n    }\n    if (headerIdx === -1) headerIdx = 0;\n    var header = lines[headerIdx] || \"\";\n    var headerTokens = header.trim().split(/s{2,}|\t/).map(function(t){ return t.trim().toLowerCase(); }).filter(function(t){ return t; });\n    var col = {};\n    for (var i = 0; i < headerTokens.length; i++) {\n      var t = headerTokens[i];\n      if (t.indexOf('vlan') !== -1) col.id = i;\n      else if (t.indexOf('name') !== -1) col.name = i;\n      else if (t.indexOf('status') !== -1) col.status = i;\n      else if (t.indexOf('ports') !== -1 || t.indexOf('port') !== -1) col.ports = i;\n    }\n\n    for (var i = headerIdx + 1; i < lines.length; i++) {\n      var ln = lines[i];\n      if (!ln || ln.indexOf('---') >= 0) continue;\n      var toks = ln.trim().split(/s{2,}|\t/).map(function(t){ return t.trim(); }).filter(function(t){ return t; });\n      if (toks.length === 0) continue;\n      // fallback: try whitespace split if columns compressed\n      if (toks.length < 3) toks = ln.trim().split(/s+/);\n      var id = parseInt(toks[col.id] || toks[0]);\n      if (isNaN(id)) { warnings.push('Failed to parse VLAN id for line: ' + ln); continue; }\n      var name = toks[col.name] || (toks[1] || '');\n      var status = toks[col.status] || '';\n      var portsRaw = (typeof col.ports !== 'undefined') ? (toks[col.ports] || '') : toks.slice(3).join(' ');\n      var ports = portsRaw ? portsRaw.split(/[,s]+/).map(function(p){ return p.trim(); }).filter(function(p){ return p; }) : [];\n      vlans.push({ id: id, name: name, status: status, ports: ports, raw: ln });\n    }\n    if (vlans.length === 0) warnings.push('No VLANs parsed - output format may have changed');\n    return { entries: vlans, warnings: warnings };\n  },\n\n  \"show vlan\": function(output) { return IOS_PARSERS['show vlan brief'](output); },\n\n  \"show ip route\": function(output) {\n    return { entries: [], warnings: [\"show ip route parser not implemented\"] };\n  },\n};\n\nfunction __getParser(command) {\n  var cmd = command.toLowerCase().trim();\n  if (IOS_PARSERS[cmd]) return IOS_PARSERS[cmd];\n  for (var key in IOS_PARSERS) {\n    if (cmd.startsWith(key.toLowerCase())) return IOS_PARSERS[key];\n  }\n  return null;\n}\n\n// expose helper for runtime (optional)\n\n// Try to expose __getParser globally (optional, may not work in all PT versions)\n";
packages/pt-runtime/dist-qtscript/runtime.js:2017:            if (!candidates.includes(t))
packages/pt-runtime/dist-qtscript/runtime.js:2025:            if (!candidates.includes(t))
packages/pt-runtime/dist-qtscript/runtime.js:3853:                if (trimmed.startsWith("'") || trimmed.startsWith("\""))
packages/pt-runtime/dist-qtscript/runtime.js:4442:    if (["green", "up", "operational", "on"].includes(raw))
packages/pt-runtime/dist-qtscript/runtime.js:4444:    if (["amber", "orange", "yellow"].includes(raw))
packages/pt-runtime/dist-qtscript/runtime.js:4446:    if (["down", "red", "off", "missing", "disconnected"].includes(raw))
packages/pt-runtime/dist-qtscript/runtime.js:5170:    return id.startsWith("HWIC-") || id.startsWith("WIC-");
packages/pt-runtime/dist-qtscript/runtime.js:5174:    return id.startsWith("NM-");
packages/pt-runtime/dist-qtscript/runtime.js:5204:    var is2811 = model.includes("2811");
packages/pt-runtime/dist-qtscript/runtime.js:6359:function startsWithText(value, prefix) {
packages/pt-runtime/dist-qtscript/runtime.js:6363:function endsWithText(value, suffix) {
packages/pt-runtime/dist-qtscript/runtime.js:6537:    return (startsWithText(text, cmd + "\n") ||
packages/pt-runtime/dist-qtscript/runtime.js:6538:        startsWithText(text, cmd) ||
packages/pt-runtime/dist-qtscript/runtime.js:6906:    return text.includes(withoutFirstChar) && !text.includes(expected);
packages/pt-runtime/dist-qtscript/runtime.js:7008:            isHost = deviceModel.toLowerCase().includes("pc") || deviceModel.toLowerCase().includes("server");
packages/pt-runtime/dist-qtscript/runtime.js:7276:                    isLongRunningCommand = cmd.startsWith("ping") || cmd.startsWith("tracert") || cmd.startsWith("trace");
packages/pt-runtime/dist-qtscript/runtime.js:7307:                    autoDismissedInitialDialog = (_d = (_c = result.warnings) === null || _c === void 0 ? void 0 : _c.includes("Initial configuration dialog was auto-dismissed")) !== null && _d !== void 0 ? _d : false;
packages/pt-runtime/dist-qtscript/runtime.js:7368:            if (line.includes("---"))
packages/pt-runtime/dist-qtscript/runtime.js:7391:                if (line.includes("---"))
packages/pt-runtime/dist-qtscript/runtime.js:7475:                if (currentInterface && line.includes("Description:")) {
packages/pt-runtime/dist-qtscript/runtime.js:7541:                if (line.includes("VLAN Name") && line.includes("Status")) {
packages/pt-runtime/dist-qtscript/runtime.js:7545:                if (line.includes("----") && inVlanSection)
packages/pt-runtime/dist-qtscript/runtime.js:7655:        if (cmd.startsWith(key))
packages/pt-runtime/dist-qtscript/runtime.js:7663:    if (trimmed.includes("% Invalid command") || trimmed.includes("% Invalid input")) {
packages/pt-runtime/dist-qtscript/runtime.js:7666:    if (trimmed.includes("% Incomplete command")) {
packages/pt-runtime/dist-qtscript/runtime.js:7669:    if (trimmed.includes("% Ambiguous command")) {
packages/pt-runtime/dist-qtscript/runtime.js:7672:    if (trimmed.includes("% ") && trimmed.includes("ERROR")) {
packages/pt-runtime/dist-qtscript/runtime.js:7676:    if (trimmed.includes("--More--") || trimmed.endsWith("--More--")) {
packages/pt-runtime/dist-qtscript/runtime.js:7691:    return classification.includes("error") ||
packages/pt-runtime/dist-qtscript/runtime.js:7692:        classification.includes("invalid") ||
packages/pt-runtime/dist-qtscript/runtime.js:7693:        classification.includes("incomplete") ||
packages/pt-runtime/dist-qtscript/runtime.js:7694:        classification.includes("ambiguous");
packages/pt-runtime/dist-qtscript/runtime.js:8059:    var isPaged = trimmed.includes("--More--");
packages/pt-runtime/dist-qtscript/runtime.js:8062:    if (trimmed.includes("(config-router)#")) {
packages/pt-runtime/dist-qtscript/runtime.js:8066:    else if (trimmed.includes("(config-line)#")) {
packages/pt-runtime/dist-qtscript/runtime.js:8070:    else if (trimmed.includes("(config-if)#")) {
packages/pt-runtime/dist-qtscript/runtime.js:8074:    else if (trimmed.includes("(config-subif)#")) {
packages/pt-runtime/dist-qtscript/runtime.js:8078:    else if (trimmed.includes("(config)#")) {
packages/pt-runtime/dist-qtscript/runtime.js:8082:    else if (trimmed.includes("#")) {
packages/pt-runtime/dist-qtscript/runtime.js:8086:    else if (trimmed.includes(">")) {
packages/pt-runtime/dist-qtscript/runtime.js:8104:    return mode === "privileged-exec" || mode.startsWith("config");
packages/pt-runtime/dist-qtscript/runtime.js:8110:    return output.includes("[confirm]") ||
packages/pt-runtime/dist-qtscript/runtime.js:8111:        output.includes("Proceed?") ||
packages/pt-runtime/dist-qtscript/runtime.js:8112:        output.includes("confirmar");
packages/pt-runtime/dist-qtscript/runtime.js:8265:                                    paging: execResult.warnings.some(function (w) { return w.toLowerCase().includes("paginación"); }),
packages/pt-runtime/dist-qtscript/runtime.js:8266:                                    awaitingConfirm: execResult.warnings.some(function (w) { return w.toLowerCase().includes("confirmación"); }),
packages/pt-runtime/dist-qtscript/runtime.js:8415:        return normalized.includes(pattern);
packages/pt-runtime/dist-qtscript/runtime.js:8590:    return (text.includes("self decompressing the image") ||
packages/pt-runtime/dist-qtscript/runtime.js:8591:        text.includes("bootstrap") ||
packages/pt-runtime/dist-qtscript/runtime.js:8592:        text.includes("rommon") ||
packages/pt-runtime/dist-qtscript/runtime.js:8593:        text.includes("boot loader"));
packages/pt-runtime/dist-qtscript/runtime.js:8606:    return (text.includes("reply from") ||
packages/pt-runtime/dist-qtscript/runtime.js:8607:        text.includes("request timed out") ||
packages/pt-runtime/dist-qtscript/runtime.js:8608:        text.includes("destination host unreachable") ||
packages/pt-runtime/dist-qtscript/runtime.js:8609:        text.includes("tracing route") ||
packages/pt-runtime/dist-qtscript/runtime.js:8610:        text.includes("trace complete") ||
packages/pt-runtime/dist-qtscript/runtime.js:8611:        text.includes("ping statistics") ||
packages/pt-runtime/dist-qtscript/runtime.js:8612:        text.includes("connected to") ||
packages/pt-runtime/dist-qtscript/runtime.js:8613:        text.includes("trying") ||
packages/pt-runtime/dist-qtscript/runtime.js:8614:        text.includes("escape character is") ||
packages/pt-runtime/dist-qtscript/runtime.js:8615:        text.includes("connection closed"));
packages/pt-runtime/dist-qtscript/runtime.js:8634:    return (text.includes("reload") &&
packages/pt-runtime/dist-qtscript/runtime.js:8635:        text.includes("confirm"));
packages/pt-runtime/dist-qtscript/runtime.js:8639:    return (text.includes("erase") &&
packages/pt-runtime/dist-qtscript/runtime.js:8640:        text.includes("confirm"));
packages/pt-runtime/dist-qtscript/runtime.js:8771:    if (afterClean.startsWith(beforeClean)) {
packages/pt-runtime/dist-qtscript/runtime.js:9390:    return Object.values(TerminalErrors).includes(code);
packages/pt-runtime/dist-qtscript/runtime.js:9782:            if (line.toLowerCase().includes(cmdLine.toLowerCase())) {
packages/pt-runtime/dist-qtscript/runtime.js:9787:            if (line.includes(cmdLine) || line.trim() === cmdLine) {
packages/pt-runtime/dist-qtscript/runtime.js:9885:        .map(function (line) { return line.trimEnd(); });
packages/pt-runtime/dist-qtscript/runtime.js:9944:        if (eventLines.length > 0 && eventLines[0].toLowerCase().includes("reply from")) {
packages/pt-runtime/dist-qtscript/runtime.js:9969:    if (recent.includes("% Invalid input detected")) {
packages/pt-runtime/dist-qtscript/runtime.js:9972:    if (recent.includes("% Incomplete command")) {
packages/pt-runtime/dist-qtscript/runtime.js:9975:    if (recent.includes("% Ambiguous command")) {
packages/pt-runtime/dist-qtscript/runtime.js:9978:    if (recent.includes("% Unknown command")) {
packages/pt-runtime/dist-qtscript/runtime.js:9981:    if (recent.includes("Translating...")) {
packages/pt-runtime/dist-qtscript/runtime.js:9986:    if (recent.includes("% Bad secrets")) {
packages/pt-runtime/dist-qtscript/runtime.js:9989:    if (recent.includes("% Not in config mode")) {
packages/pt-runtime/dist-qtscript/runtime.js:10000:    if (lower.includes("invalid command") || lower.includes("bad command or file name")) {
packages/pt-runtime/dist-qtscript/runtime.js:10003:    if (lower.includes("request timed out")) {
packages/pt-runtime/dist-qtscript/runtime.js:10006:    if (lower.includes("destination host unreachable")) {
packages/pt-runtime/dist-qtscript/runtime.js:10009:    if (lower.includes("could not find host") || lower.includes("unknown host")) {
packages/pt-runtime/dist-qtscript/runtime.js:10012:    if (lower.includes("ping request could not find host")) {
packages/pt-runtime/dist-qtscript/runtime.js:10884:    var wizardInterventions = events.filter(function (e) { var _a; return (_a = e.normalized) === null || _a === void 0 ? void 0 : _a.includes("wizard"); }).length;
packages/pt-runtime/dist-qtscript/runtime.js:10885:    var confirmations = events.filter(function (e) { var _a; return (_a = e.normalized) === null || _a === void 0 ? void 0 : _a.includes("yes/no"); }).length;
packages/pt-runtime/dist-qtscript/runtime.js:10887:    if (output.includes("--More--") && pagerAdvances === 0) {
packages/pt-runtime/dist-qtscript/runtime.js:10892:        var changedMode = modeKeywords.some(function (kw) { return command.toLowerCase().includes(kw); });
packages/pt-runtime/dist-qtscript/runtime.js:11157:        if (!warnings.includes("No output received")) {
packages/pt-runtime/dist-qtscript/runtime.js:11175:    if (text.includes("% Invalid") ||
packages/pt-runtime/dist-qtscript/runtime.js:11176:        text.includes("% Incomplete") ||
packages/pt-runtime/dist-qtscript/runtime.js:11177:        text.includes("% Ambiguous") ||
packages/pt-runtime/dist-qtscript/runtime.js:11178:        text.includes("% Unknown") ||
packages/pt-runtime/dist-qtscript/runtime.js:11179:        text.includes("%Error") ||
packages/pt-runtime/dist-qtscript/runtime.js:11180:        text.toLowerCase().includes("invalid command")) {
packages/pt-runtime/dist-qtscript/runtime.js:11250:    if (recoverableCodes.includes(code))
packages/pt-runtime/dist-qtscript/runtime.js:11252:    if (message === null || message === void 0 ? void 0 : message.includes("No output received"))
packages/pt-runtime/dist-qtscript/runtime.js:11713:        var promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
packages/pt-runtime/dist-qtscript/runtime.js:11741:            if (!this.config.warnings.includes("No output received")) {
packages/pt-runtime/dist-qtscript/runtime.js:12235:            message.includes("No output received");
packages/pt-runtime/dist-qtscript/runtime.js:12259:    return (output.includes("initial configuration dialog?") ||
packages/pt-runtime/dist-qtscript/runtime.js:12260:        output.includes("[yes/no]") ||
packages/pt-runtime/dist-qtscript/runtime.js:12261:        output.includes("continuar con la configuración"));
/Users/andresgaibor/pt-dev/runtime.js:1974:    return "var IOS_PARSERS = {\n  \"show ip interface brief\": function(output) {\n    var entries = [];\n    var warnings = [];\n    var lines = (output||\"\").split(\"\\n\").map(function(l){ return l.replace(/\\r/g, \"\"); }).filter(function(l){ return l.trim().length > 0; });\n    if (lines.length === 0) return { entries: [], warnings: [\"Empty output\"] };\n\n    // Heuristic: find header line within the first few lines\n    var headerIdx = -1;\n    for (var i = 0; i < Math.min(6, lines.length); i++) {\n      var low = lines[i].toLowerCase();\n      if (low.indexOf('interface') !== -1 && (low.indexOf('ip') !== -1 || low.indexOf('ip-address') !== -1) && (low.indexOf('protocol') !== -1 || low.indexOf('status') !== -1)) {\n        headerIdx = i;\n        break;\n      }\n    }\n    if (headerIdx === -1) headerIdx = 0;\n\n    var header = lines[headerIdx] || \"\";\n    var headerTokens = header.trim().split(/s{2,}|\t/).map(function(t){ return t.trim().toLowerCase(); }).filter(function(t){ return t; });\n    var col = {};\n    for (var i = 0; i < headerTokens.length; i++) {\n      var t = headerTokens[i];\n      if (t.indexOf('interface') !== -1) col.iface = i;\n      else if (t.indexOf('ip') !== -1 || t.indexOf('ip-address') !== -1) col.ip = i;\n      else if (t === 'ok?' || t.indexOf('ok') !== -1) col.ok = i;\n      else if (t.indexOf('method') !== -1) col.method = i;\n      else if (t.indexOf('status') !== -1) col.status = i;\n      else if (t.indexOf('protocol') !== -1) col.protocol = i;\n    }\n\n    for (var i = headerIdx + 1; i < lines.length; i++) {\n      var ln = lines[i];\n      if (!ln || ln.indexOf('---') >= 0) continue;\n      var toks = ln.trim().split(/s{2,}|\t/).map(function(t){ return t.trim(); }).filter(function(t){ return t; });\n      if (toks.length < 2) toks = ln.trim().split(/s+/);\n      if (toks.length === 0) continue;\n      var name = (typeof col.iface !== 'undefined') ? (toks[col.iface] || toks[0]) : toks[0];\n      var ip = (typeof col.ip !== 'undefined') ? (toks[col.ip] || 'unassigned') : (toks[1] || 'unassigned');\n      var status = (typeof col.status !== 'undefined') ? toks[col.status] : (toks.length >= 4 ? toks[3] : '');\n      var protocol = (typeof col.protocol !== 'undefined') ? toks[col.protocol] : toks[toks.length - 1];\n      entries.push({ interface: name, ipAddress: ip, status: status, protocol: protocol, raw: ln });\n    }\n\n    if (entries.length === 0) warnings.push('No interfaces parsed - output format may have changed');\n    return { entries: entries, warnings: warnings };\n  },\n\n  \"show vlan brief\": function(output) {\n    var vlans = [];\n    var warnings = [];\n    var lines = (output||\"\").split(\"\\n\").map(function(l){ return l.replace(/\\r/g, \"\"); }).filter(function(l){ return l.trim().length > 0; });\n    if (lines.length === 0) return { entries: [], warnings: [\"Empty output\"] };\n\n    // locate header line heuristically\n    var headerIdx = -1;\n    for (var i = 0; i < Math.min(6, lines.length); i++) {\n      var low = lines[i].toLowerCase();\n      if (low.indexOf('vlan') !== -1 && low.indexOf('name') !== -1) { headerIdx = i; break; }\n    }\n    if (headerIdx === -1) headerIdx = 0;\n    var header = lines[headerIdx] || \"\";\n    var headerTokens = header.trim().split(/s{2,}|\t/).map(function(t){ return t.trim().toLowerCase(); }).filter(function(t){ return t; });\n    var col = {};\n    for (var i = 0; i < headerTokens.length; i++) {\n      var t = headerTokens[i];\n      if (t.indexOf('vlan') !== -1) col.id = i;\n      else if (t.indexOf('name') !== -1) col.name = i;\n      else if (t.indexOf('status') !== -1) col.status = i;\n      else if (t.indexOf('ports') !== -1 || t.indexOf('port') !== -1) col.ports = i;\n    }\n\n    for (var i = headerIdx + 1; i < lines.length; i++) {\n      var ln = lines[i];\n      if (!ln || ln.indexOf('---') >= 0) continue;\n      var toks = ln.trim().split(/s{2,}|\t/).map(function(t){ return t.trim(); }).filter(function(t){ return t; });\n      if (toks.length === 0) continue;\n      // fallback: try whitespace split if columns compressed\n      if (toks.length < 3) toks = ln.trim().split(/s+/);\n      var id = parseInt(toks[col.id] || toks[0]);\n      if (isNaN(id)) { warnings.push('Failed to parse VLAN id for line: ' + ln); continue; }\n      var name = toks[col.name] || (toks[1] || '');\n      var status = toks[col.status] || '';\n      var portsRaw = (typeof col.ports !== 'undefined') ? (toks[col.ports] || '') : toks.slice(3).join(' ');\n      var ports = portsRaw ? portsRaw.split(/[,s]+/).map(function(p){ return p.trim(); }).filter(function(p){ return p; }) : [];\n      vlans.push({ id: id, name: name, status: status, ports: ports, raw: ln });\n    }\n    if (vlans.length === 0) warnings.push('No VLANs parsed - output format may have changed');\n    return { entries: vlans, warnings: warnings };\n  },\n\n  \"show vlan\": function(output) { return IOS_PARSERS['show vlan brief'](output); },\n\n  \"show ip route\": function(output) {\n    return { entries: [], warnings: [\"show ip route parser not implemented\"] };\n  },\n};\n\nfunction __getParser(command) {\n  var cmd = command.toLowerCase().trim();\n  if (IOS_PARSERS[cmd]) return IOS_PARSERS[cmd];\n  for (var key in IOS_PARSERS) {\n    if (cmd.startsWith(key.toLowerCase())) return IOS_PARSERS[key];\n  }\n  return null;\n}\n\n// expose helper for runtime (optional)\n\n// Try to expose __getParser globally (optional, may not work in all PT versions)\n";
/Users/andresgaibor/pt-dev/runtime.js:2017:            if (!candidates.includes(t))
/Users/andresgaibor/pt-dev/runtime.js:2025:            if (!candidates.includes(t))
/Users/andresgaibor/pt-dev/runtime.js:3853:                if (trimmed.startsWith("'") || trimmed.startsWith("\""))
/Users/andresgaibor/pt-dev/runtime.js:4442:    if (["green", "up", "operational", "on"].includes(raw))
/Users/andresgaibor/pt-dev/runtime.js:4444:    if (["amber", "orange", "yellow"].includes(raw))
/Users/andresgaibor/pt-dev/runtime.js:4446:    if (["down", "red", "off", "missing", "disconnected"].includes(raw))
/Users/andresgaibor/pt-dev/runtime.js:5170:    return id.startsWith("HWIC-") || id.startsWith("WIC-");
/Users/andresgaibor/pt-dev/runtime.js:5174:    return id.startsWith("NM-");
/Users/andresgaibor/pt-dev/runtime.js:5204:    var is2811 = model.includes("2811");
/Users/andresgaibor/pt-dev/runtime.js:6359:function startsWithText(value, prefix) {
/Users/andresgaibor/pt-dev/runtime.js:6363:function endsWithText(value, suffix) {
/Users/andresgaibor/pt-dev/runtime.js:6535:    return (startsWithText(text, cmd + "\n") ||
/Users/andresgaibor/pt-dev/runtime.js:6536:        startsWithText(text, cmd) ||
/Users/andresgaibor/pt-dev/runtime.js:6904:    return text.includes(withoutFirstChar) && !text.includes(expected);
/Users/andresgaibor/pt-dev/runtime.js:7006:            isHost = deviceModel.toLowerCase().includes("pc") || deviceModel.toLowerCase().includes("server");
/Users/andresgaibor/pt-dev/runtime.js:7274:                    isLongRunningCommand = cmd.startsWith("ping") || cmd.startsWith("tracert") || cmd.startsWith("trace");
/Users/andresgaibor/pt-dev/runtime.js:7305:                    autoDismissedInitialDialog = (_d = (_c = result.warnings) === null || _c === void 0 ? void 0 : _c.includes("Initial configuration dialog was auto-dismissed")) !== null && _d !== void 0 ? _d : false;
/Users/andresgaibor/pt-dev/runtime.js:7366:            if (line.includes("---"))
/Users/andresgaibor/pt-dev/runtime.js:7389:                if (line.includes("---"))
/Users/andresgaibor/pt-dev/runtime.js:7473:                if (currentInterface && line.includes("Description:")) {
/Users/andresgaibor/pt-dev/runtime.js:7539:                if (line.includes("VLAN Name") && line.includes("Status")) {
/Users/andresgaibor/pt-dev/runtime.js:7543:                if (line.includes("----") && inVlanSection)
/Users/andresgaibor/pt-dev/runtime.js:7653:        if (cmd.startsWith(key))
/Users/andresgaibor/pt-dev/runtime.js:7661:    if (trimmed.includes("% Invalid command") || trimmed.includes("% Invalid input")) {
/Users/andresgaibor/pt-dev/runtime.js:7664:    if (trimmed.includes("% Incomplete command")) {
/Users/andresgaibor/pt-dev/runtime.js:7667:    if (trimmed.includes("% Ambiguous command")) {
/Users/andresgaibor/pt-dev/runtime.js:7670:    if (trimmed.includes("% ") && trimmed.includes("ERROR")) {
/Users/andresgaibor/pt-dev/runtime.js:7674:    if (trimmed.includes("--More--") || trimmed.endsWith("--More--")) {
/Users/andresgaibor/pt-dev/runtime.js:7689:    return classification.includes("error") ||
/Users/andresgaibor/pt-dev/runtime.js:7690:        classification.includes("invalid") ||
/Users/andresgaibor/pt-dev/runtime.js:7691:        classification.includes("incomplete") ||
/Users/andresgaibor/pt-dev/runtime.js:7692:        classification.includes("ambiguous");
/Users/andresgaibor/pt-dev/runtime.js:8057:    var isPaged = trimmed.includes("--More--");
/Users/andresgaibor/pt-dev/runtime.js:8060:    if (trimmed.includes("(config-router)#")) {
/Users/andresgaibor/pt-dev/runtime.js:8064:    else if (trimmed.includes("(config-line)#")) {
/Users/andresgaibor/pt-dev/runtime.js:8068:    else if (trimmed.includes("(config-if)#")) {
/Users/andresgaibor/pt-dev/runtime.js:8072:    else if (trimmed.includes("(config-subif)#")) {
/Users/andresgaibor/pt-dev/runtime.js:8076:    else if (trimmed.includes("(config)#")) {
/Users/andresgaibor/pt-dev/runtime.js:8080:    else if (trimmed.includes("#")) {
/Users/andresgaibor/pt-dev/runtime.js:8084:    else if (trimmed.includes(">")) {
/Users/andresgaibor/pt-dev/runtime.js:8102:    return mode === "privileged-exec" || mode.startsWith("config");
/Users/andresgaibor/pt-dev/runtime.js:8108:    return output.includes("[confirm]") ||
/Users/andresgaibor/pt-dev/runtime.js:8109:        output.includes("Proceed?") ||
/Users/andresgaibor/pt-dev/runtime.js:8110:        output.includes("confirmar");
/Users/andresgaibor/pt-dev/runtime.js:8263:                                    paging: execResult.warnings.some(function (w) { return w.toLowerCase().includes("paginación"); }),
/Users/andresgaibor/pt-dev/runtime.js:8264:                                    awaitingConfirm: execResult.warnings.some(function (w) { return w.toLowerCase().includes("confirmación"); }),
/Users/andresgaibor/pt-dev/runtime.js:8413:        return normalized.includes(pattern);
/Users/andresgaibor/pt-dev/runtime.js:8588:    return (text.includes("self decompressing the image") ||
/Users/andresgaibor/pt-dev/runtime.js:8589:        text.includes("bootstrap") ||
/Users/andresgaibor/pt-dev/runtime.js:8590:        text.includes("rommon") ||
/Users/andresgaibor/pt-dev/runtime.js:8591:        text.includes("boot loader"));
/Users/andresgaibor/pt-dev/runtime.js:8604:    return (text.includes("reply from") ||
/Users/andresgaibor/pt-dev/runtime.js:8605:        text.includes("request timed out") ||
/Users/andresgaibor/pt-dev/runtime.js:8606:        text.includes("destination host unreachable") ||
/Users/andresgaibor/pt-dev/runtime.js:8607:        text.includes("tracing route") ||
/Users/andresgaibor/pt-dev/runtime.js:8608:        text.includes("trace complete") ||
/Users/andresgaibor/pt-dev/runtime.js:8609:        text.includes("ping statistics") ||
/Users/andresgaibor/pt-dev/runtime.js:8610:        text.includes("connected to") ||
/Users/andresgaibor/pt-dev/runtime.js:8611:        text.includes("trying") ||
/Users/andresgaibor/pt-dev/runtime.js:8612:        text.includes("escape character is") ||
/Users/andresgaibor/pt-dev/runtime.js:8613:        text.includes("connection closed"));
/Users/andresgaibor/pt-dev/runtime.js:8632:    return (text.includes("reload") &&
/Users/andresgaibor/pt-dev/runtime.js:8633:        text.includes("confirm"));
/Users/andresgaibor/pt-dev/runtime.js:8637:    return (text.includes("erase") &&
/Users/andresgaibor/pt-dev/runtime.js:8638:        text.includes("confirm"));
/Users/andresgaibor/pt-dev/runtime.js:8769:    if (afterClean.startsWith(beforeClean)) {
/Users/andresgaibor/pt-dev/runtime.js:9388:    return Object.values(TerminalErrors).includes(code);
/Users/andresgaibor/pt-dev/runtime.js:9780:            if (line.toLowerCase().includes(cmdLine.toLowerCase())) {
/Users/andresgaibor/pt-dev/runtime.js:9785:            if (line.includes(cmdLine) || line.trim() === cmdLine) {
/Users/andresgaibor/pt-dev/runtime.js:9883:        .map(function (line) { return line.trimEnd(); });
/Users/andresgaibor/pt-dev/runtime.js:9942:        if (eventLines.length > 0 && eventLines[0].toLowerCase().includes("reply from")) {
/Users/andresgaibor/pt-dev/runtime.js:9967:    if (recent.includes("% Invalid input detected")) {
/Users/andresgaibor/pt-dev/runtime.js:9970:    if (recent.includes("% Incomplete command")) {
/Users/andresgaibor/pt-dev/runtime.js:9973:    if (recent.includes("% Ambiguous command")) {
/Users/andresgaibor/pt-dev/runtime.js:9976:    if (recent.includes("% Unknown command")) {
/Users/andresgaibor/pt-dev/runtime.js:9979:    if (recent.includes("Translating...")) {
/Users/andresgaibor/pt-dev/runtime.js:9984:    if (recent.includes("% Bad secrets")) {
/Users/andresgaibor/pt-dev/runtime.js:9987:    if (recent.includes("% Not in config mode")) {
/Users/andresgaibor/pt-dev/runtime.js:9998:    if (lower.includes("invalid command") || lower.includes("bad command or file name")) {
/Users/andresgaibor/pt-dev/runtime.js:10001:    if (lower.includes("request timed out")) {
/Users/andresgaibor/pt-dev/runtime.js:10004:    if (lower.includes("destination host unreachable")) {
/Users/andresgaibor/pt-dev/runtime.js:10007:    if (lower.includes("could not find host") || lower.includes("unknown host")) {
/Users/andresgaibor/pt-dev/runtime.js:10010:    if (lower.includes("ping request could not find host")) {
/Users/andresgaibor/pt-dev/runtime.js:10882:    var wizardInterventions = events.filter(function (e) { var _a; return (_a = e.normalized) === null || _a === void 0 ? void 0 : _a.includes("wizard"); }).length;
/Users/andresgaibor/pt-dev/runtime.js:10883:    var confirmations = events.filter(function (e) { var _a; return (_a = e.normalized) === null || _a === void 0 ? void 0 : _a.includes("yes/no"); }).length;
/Users/andresgaibor/pt-dev/runtime.js:10885:    if (output.includes("--More--") && pagerAdvances === 0) {
/Users/andresgaibor/pt-dev/runtime.js:10890:        var changedMode = modeKeywords.some(function (kw) { return command.toLowerCase().includes(kw); });
/Users/andresgaibor/pt-dev/runtime.js:11155:        if (!warnings.includes("No output received")) {
/Users/andresgaibor/pt-dev/runtime.js:11173:    if (text.includes("% Invalid") ||
/Users/andresgaibor/pt-dev/runtime.js:11174:        text.includes("% Incomplete") ||
/Users/andresgaibor/pt-dev/runtime.js:11175:        text.includes("% Ambiguous") ||
/Users/andresgaibor/pt-dev/runtime.js:11176:        text.includes("% Unknown") ||
/Users/andresgaibor/pt-dev/runtime.js:11177:        text.includes("%Error") ||
/Users/andresgaibor/pt-dev/runtime.js:11178:        text.toLowerCase().includes("invalid command")) {
/Users/andresgaibor/pt-dev/runtime.js:11248:    if (recoverableCodes.includes(code))
/Users/andresgaibor/pt-dev/runtime.js:11250:    if (message === null || message === void 0 ? void 0 : message.includes("No output received"))
/Users/andresgaibor/pt-dev/runtime.js:11711:        var promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
/Users/andresgaibor/pt-dev/runtime.js:11739:            if (!this.config.warnings.includes("No output received")) {
/Users/andresgaibor/pt-dev/runtime.js:12233:            message.includes("No output received");
/Users/andresgaibor/pt-dev/runtime.js:12257:    return (output.includes("initial configuration dialog?") ||
/Users/andresgaibor/pt-dev/runtime.js:12258:        output.includes("[yes/no]") ||
/Users/andresgaibor/pt-dev/runtime.js:12259:        output.includes("continuar con la configuración"));
```

## grep native handler key fixes
```
packages/pt-runtime/src/handlers/terminal-native-exec.ts:157:async function wakeTerminal(term: PTTerminal, timeoutMs: number): Promise<void> {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:180:async function ensurePrivilegedIfNeeded(term: PTTerminal, command: string): Promise<boolean> {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:181:  await wakeTerminal(term, 1800);
packages/pt-runtime/src/handlers/terminal-native-exec.ts:300:  await wakeTerminal(term, 1800);
packages/pt-runtime/src/handlers/terminal-native-exec.ts:303:  const privilegedOk = await ensurePrivilegedIfNeeded(term, command);
packages/pt-runtime/src/handlers/terminal-native-exec.ts:308:      code: "NATIVE_EXEC_PRIVILEGE_REQUIRED",
packages/pt-runtime/src/handlers/terminal-native-exec.ts:327:        statusCode: 1,
packages/pt-runtime/src/handlers/terminal-native-exec.ts:409:      code: "NATIVE_EXEC_IOS_ERROR",
packages/pt-runtime/src/handlers/terminal-native-exec.ts:424:        statusCode: 1,
packages/pt-runtime/src/handlers/terminal-native-exec.ts:451:        statusCode: 1,
packages/pt-runtime/src/handlers/terminal-native-exec.ts:475:      statusCode: 0,
```

## tests
```
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
```

## generate deploy
```
Generated: dist-qtscript/
Deployed to: /Users/andresgaibor/pt-dev
```

## deployed forbidden methods after generate
```
```

## wake terminal
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
try { t.enterChar(13,0); } catch(e) {}
pause(300);
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
try { t.enterChar(13,0); } catch(e) {}
pause(300);
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 411,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\ntry { t.enterChar(13,0); } catch(e) {}\npause(300);\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\" MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018685",
      "seq": 18685,
      "type": "omni.evaluate.raw",
      "startedAt": 1777414652619,
      "completedAt": 1777414653071,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\" MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777414652543,
        "resultSeenAt": 1777414653072,
        "receivedAt": 1777414653072,
        "waitMs": 529,
        "completedAtMs": 1777414653071
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.7s
```


## show running-config attempt 1
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": 1,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal quedó en prompt "
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 0.5s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 1
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018688",
      "seq": 18688,
      "type": "omni.evaluate.raw",
      "startedAt": 1777414655580,
      "completedAt": 1777414655872,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777414655029,
        "resultSeenAt": 1777414655902,
        "receivedAt": 1777414655902,
        "waitMs": 873,
        "completedAtMs": 1777414655872
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.9s
```

## show running-config attempt 2
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": null,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 12.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 2
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018691",
      "seq": 18691,
      "type": "omni.evaluate.raw",
      "startedAt": 1777414669689,
      "completedAt": 1777414669727,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777414669632,
        "resultSeenAt": 1777414669747,
        "receivedAt": 1777414669747,
        "waitMs": 115,
        "completedAtMs": 1777414669727
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.2s
```

## show running-config attempt 3
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": 1,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal quedó en prompt "
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 0.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 3
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"mbly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018694",
      "seq": 18694,
      "type": "omni.evaluate.raw",
      "startedAt": 1777414673678,
      "completedAt": 1777414673714,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"mbly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777414673641,
        "resultSeenAt": 1777414673726,
        "receivedAt": 1777414673726,
        "waitMs": 85,
        "completedAtMs": 1777414673714
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.2s
```

## show running-config attempt 4
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": 1,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal quedó en prompt "
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 0.2s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 4
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018697",
      "seq": 18697,
      "type": "omni.evaluate.raw",
      "startedAt": 1777414675580,
      "completedAt": 1777414675609,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777414675483,
        "resultSeenAt": 1777414675627,
        "receivedAt": 1777414675627,
        "waitMs": 144,
        "completedAtMs": 1777414675609
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.2s
```

## show running-config attempt 5
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": 1,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal quedó en prompt "
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 0.2s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 5
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"r        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018700",
      "seq": 18700,
      "type": "omni.evaluate.raw",
      "startedAt": 1777414677180,
      "completedAt": 1777414677211,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"r        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777414677087,
        "resultSeenAt": 1777414677229,
        "receivedAt": 1777414677229,
        "waitMs": 142,
        "completedAtMs": 1777414677211
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.2s
```

## show version sanity
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "",
  "rawOutput": "",
  "status": null,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 12.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## recent native result files
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018702.json -----
{
  "id": "cmd_000000018702",
  "seq": 18702,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_TIMEOUT",
    "message": "terminal.native.exec no complet\u00f3 show version en 12000ms",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_TIMEOUT",
  "error": "terminal.native.exec no complet\u00f3 show version en 12000ms",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "unknown",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "timeout",
    "pagerAdvances": 0,
    "elapsedMs": 12069,
    "input": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018699.json -----
{
  "id": "cmd_000000018699",
  "seq": 18699,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 9,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018696.json -----
{
  "id": "cmd_000000018696",
  "seq": 18696,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 8,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018693.json -----
{
  "id": "cmd_000000018693",
  "seq": 18693,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 15,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018687.json -----
{
  "id": "cmd_000000018687",
  "seq": 18687,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 58,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018684.json -----
{
  "id": "cmd_000000018684",
  "seq": 18684,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018680.json -----
{
  "id": "cmd_000000018680",
  "seq": 18680,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018677.json -----
{
  "id": "cmd_000000018677",
  "seq": 18677,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018676.json -----
{
  "id": "cmd_000000018676",
  "seq": 18676,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018674.json -----
{
  "id": "cmd_000000018674",
  "seq": 18674,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018673.json -----
{
  "id": "cmd_000000018673",
  "seq": 18673,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018671.json -----
{
  "id": "cmd_000000018671",
  "seq": 18671,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\" changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018670.json -----
{
  "id": "cmd_000000018670",
  "seq": 18670,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018668.json -----
{
  "id": "cmd_000000018668",
  "seq": 18668,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"net0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018667.json -----
{
  "id": "cmd_000000018667",
  "seq": 18667,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018665.json -----
{
  "id": "cmd_000000018665",
  "seq": 18665,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"tocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018664.json -----
{
  "id": "cmd_000000018664",
  "seq": 18664,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018662.json -----
{
  "id": "cmd_000000018662",
  "seq": 18662,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018661.json -----
{
  "id": "cmd_000000018661",
  "seq": 18661,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018659.json -----
{
  "id": "cmd_000000018659",
  "seq": 18659,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"o up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018658.json -----
{
  "id": "cmd_000000018658",
  "seq": 18658,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018652.json -----
{
  "id": "cmd_000000018652",
  "seq": 18652,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018649.json -----
{
  "id": "cmd_000000018649",
  "seq": 18649,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018643.json -----
{
  "id": "cmd_000000018643",
  "seq": 18643,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018640.json -----
{
  "id": "cmd_000000018640",
  "seq": 18640,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018634.json -----
{
  "id": "cmd_000000018634",
  "seq": 18634,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018631.json -----
{
  "id": "cmd_000000018631",
  "seq": 18631,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018628.json -----
{
  "id": "cmd_000000018628",
  "seq": 18628,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018625.json -----
{
  "id": "cmd_000000018625",
  "seq": 18625,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018622.json -----
{
  "id": "cmd_000000018622",
  "seq": 18622,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018619.json -----
{
  "id": "cmd_000000018619",
  "seq": 18619,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}
```
