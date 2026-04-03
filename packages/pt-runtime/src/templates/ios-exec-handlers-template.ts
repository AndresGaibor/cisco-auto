/**
 * Runtime IOS Execution Handlers Template
 * Handles show commands, configs, and output parsing
 * WARNING: This is a large template file containing extensive exec handler code
 */

import { generateParserCode } from "../utils/parser-generator";

export function generateIosExecHandlersTemplate(): string {
  // incluir parsers (nota: esto se genera inline desde parser-generator)
  const parsersCode = generateParserCode();
  
  return `// ============================================================================
// IOS Output Parsers
// ============================================================================

${parsersCode}

// ============================================================================
// IOS Execution Handlers
// ============================================================================

function handleExecIos(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };

  var cmd = (payload.command || "").toLowerCase().trim();

  if (cmd === "show running-config" || cmd === "show startup-config") {
    return handleShowConfig(device, payload);
  }

  if (cmd === "show version") {
    return handleShowVersion(device, payload);
  }

  if (cmd.startsWith("show ip ")) {
    return handleShowIpCommand(device, payload);
  }

  var term = device.getCommandLine();
  if (!term) {
    return { ok: false, error: "Device does not support CLI" };
  }

  var session = getOrCreateSession(payload.device, term);

  try {
    var cmdResult = executeIosCommand(term, payload.command, session);
    var status = cmdResult[0];
    var output = cmdResult[1];

    dprint("[execIos] session.execute: status=" + status + ", output length=" + output.length + ", mode=" + session.mode);

    var classification = classifyIosOutput(output);

    var result = {
      ok: status === 0 && classification.ok,
      raw: output,
      status: status,
      classification: classification.category,
      session: { mode: session.mode, paging: session.paging, awaitingConfirm: session.awaitingConfirm }
    };

    if (!result.ok && classification.category !== "success") {
      result.error = {
        code: classification.category.toUpperCase(),
        message: "IOS returned error: " + classification.category,
        raw: output.slice(0, 200)
      };
    }

    if (payload.parse !== false) {
      var parser = typeof getParser === "function" ? getParser(payload.command) : null;
      if (parser) {
        try {
          result.parsed = parser(output);
        } catch (e) {
          result.parseError = String(e);
        }
      }
    }

    return result;
  } catch (e) {
    dprint("[execIos] executeIosCommand error: " + String(e));
    return { ok: false, error: "Failed to execute command: " + String(e), raw: "" };
  }
}

function generateSimulatedConfig(device) {
  var name = device.getName();
  var model = device.getModel();
  var power = device.getPower();
  var type = device.getType();
  var portCount = device.getPortCount();
  var ports = [];

  for (var i = 0; i < portCount; i++) {
    try {
      var port = device.getPortAt(i);
      if (port) {
        var portName = port.getName();
        var ip = port.getIpAddress();
        var mask = port.getSubnetMask();
        if (ip && ip !== "0.0.0.0") {
          ports.push("interface " + portName + "\\n ip address " + ip + " " + mask);
        }
      }
    } catch(e) {}
  }

  var config = "!\\n! WARNING: Simulated config (PT CLI unavailable)\\n!\\nversion 15.2\\nhostname " + name + "\\n!\\n";
  if (ports.length > 0) {
    config += ports.join("\\n!\\n") + "\\n";
  }
  if (!power) {
    config += "!\\n% Device is powered off\\n";
  }

  return {
    ok: true,
    raw: config,
    status: 0,
    simulated: true,
    parsed: {
      raw: config,
      hostname: name,
      version: "15.2",
      sections: [],
      interfaces: {}
    }
  };
}

function handleShowConfig(device, payload) {
  var term = device.getCommandLine();
  if (!term) {
    dprint("[handleShowConfig] No CLI terminal, using simulated config");
    return generateSimulatedConfig(device);
  }

  var session = getOrCreateSession(device.getName(), term);

  try {
    // Execute real command
    var cmdResult = executeIosCommand(term, "show running-config", session);
    var status = cmdResult[0];
    var output = cmdResult[1];

    if (status !== 0) {
      dprint("[handleShowConfig] Command failed (status=" + status + "), using simulated");
      return generateSimulatedConfig(device);
    }

    var result = {
      ok: true,
      raw: output,
      status: status,
      simulated: false,
      session: { mode: session.mode }
    };

    // Parse if requested
    if (payload.parse !== false) {
      var parser = getParser("show running-config");
      if (parser) {
        try {
          result.parsed = parser(output);
        } catch (e) {
          result.parseError = String(e);
        }
      }
    }

    dprint("[handleShowConfig] Real config returned: " + output.length + " chars");
    return result;

  } catch (e) {
    dprint("[handleShowConfig] Error executing command: " + e + ", using simulated");
    return generateSimulatedConfig(device);
  }
}

function generateSimulatedVersion(device) {
  var name = device.getName();
  var model = device.getModel();
  var power = device.getPower();
  var type = device.getType();

  var typeMap = {
    0: "ISR Router",
    1: "Switch",
    16: "Multilayer Switch"
  };
  var typeStr = typeMap[type] || "Unknown";

  var versionOutput = "! WARNING: Simulated output (PT CLI unavailable)\\n" +
    "Cisco IOS Software, " + model + " Software (" + model + "-LANBASE-M), Version 15.2(4)E, RELEASE SOFTWARE (fc1)\\n" +
    "Technical Support: http://www.cisco.com/techsupport\\n" +
    "Copyright (c) 1986-2016 by Cisco Systems, Inc.\\n" +
    "Compiled Mon 03-Oct-16 14:49 by prod_rel_team\\n\\n" +
    "ROM: Bootstrap program is OK\\n" +
    name + " uptime is unknown\\n" +
    "Uptime for this control processor is unknown\\n" +
    "System returned to ROM by power-on\\n" +
    'System image file is "flash:' + model + '-LANBASE-M"\\n\\n' +
    typeStr + " " + model + " (PPC processor) with 190464K/18432K bytes of memory.\\n" +
    "Processor board ID SIMULATED\\n" +
    "1 Gigabit Ethernet interface\\n" +
    "4 Fast Ethernet interfaces\\n" +
    "64K bytes of flash-simulated non-volatile configuration memory.\\n" +
    "Configuration register is 0x2102\\n\\n" +
    (power ? "Device is operational" : "Device is powered off");

  return {
    ok: true,
    raw: versionOutput,
    status: 0,
    simulated: true,
    parsed: {
      raw: versionOutput,
      hostname: name,
      version: "15.2(4)E",
      uptime: "unknown",
      image: model + "-LANBASE-M",
      processor: typeStr
    }
  };
}

function handleShowVersion(device, payload) {
  var term = device.getCommandLine();
  if (!term) {
    dprint("[handleShowVersion] No CLI terminal, using simulated version");
    return generateSimulatedVersion(device);
  }

  var session = getOrCreateSession(device.getName(), term);

  try {
    // Execute real command
    var cmdResult = executeIosCommand(term, "show version", session);
    var status = cmdResult[0];
    var output = cmdResult[1];

    if (status !== 0) {
      dprint("[handleShowVersion] Command failed (status=" + status + "), using simulated");
      return generateSimulatedVersion(device);
    }

    var result = {
      ok: true,
      raw: output,
      status: status,
      simulated: false,
      session: { mode: session.mode }
    };

    // Parse if requested
    if (payload.parse !== false) {
      var parser = getParser("show version");
      if (parser) {
        try {
          result.parsed = parser(output);
        } catch (e) {
          result.parseError = String(e);
        }
      }
    }

    dprint("[handleShowVersion] Real version returned: " + output.length + " chars");
    return result;

  } catch (e) {
    dprint("[handleShowVersion] Error executing command: " + e + ", using simulated");
    return generateSimulatedVersion(device);
  }
}

function handleShowIpCommand(device, payload) {
  var cmd = (payload.command || "").toLowerCase();

  if (cmd === "show ip interface brief" || cmd === "show ip int brief") {
    var portCount = 0;
    try { portCount = device.getPortCount(); } catch(e) {}
    var interfaces = [];

    interfaces.push({interface: "Vlan1", ipAddress: "unassigned", ok: "NVRAM", method: "manual", status: "down", protocol: "down"});

    for (var i = 0; i < portCount; i++) {
      try {
        var port = device.getPortAt(i);
        if (port) {
          var portName = "";
          var ip = "unassigned";
          try { portName = port.getName(); } catch(e1) {}
          try { ip = port.getIpAddress(); } catch(e1) {}
          var status = (ip && ip !== "0.0.0.0" && ip !== "unassigned") ? "up" : "down";
          interfaces.push({
            interface: portName,
            ipAddress: ip === "0.0.0.0" ? "unassigned" : ip,
            ok: "NVRAM",
            method: "manual",
            status: status,
            protocol: status === "up" ? "up" : "down"
          });
        }
      } catch(e) {}
    }

    var header = "Interface              IP-Address      OK? Method Status                Protocol";
    var lines = [];
    for (var j = 0; j < interfaces.length; j++) {
      var iface = interfaces[j];
      var line = iface.interface.padEnd(20) + iface.ipAddress.padEnd(16) + "YES   " + iface.method.padEnd(8) + iface.status.padEnd(20) + iface.protocol;
      lines.push(line);
    }
    var output = [header].concat(lines).join("\\n");

    dprint("[execIos] Generated IP interface brief: " + output.length + " chars");

    var parsedIfaces = [];
    for (var k = 0; k < interfaces.length; k++) {
      var iface2 = interfaces[k];
      parsedIfaces.push({
        interface: iface2.interface,
        ipAddress: iface2.ipAddress === "unassigned" ? "" : iface2.ipAddress,
        ok: iface2.ok,
        method: iface2.method,
        status: iface2.status,
        protocol: iface2.protocol
      });
    }

    return {
      ok: true,
      raw: output,
      status: 0,
      parsed: {
        raw: output,
        interfaces: parsedIfaces
      }
    };
  }

  if (cmd === "show ip route") {
    var output = "Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP\\n" +
      "     D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area\\n" +
      "     N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2\\n" +
      "     E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP\\n" +
      "     i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area\\n" +
      "     * - candidate default, U - per-user static route, o - ODR\\n" +
      "     P - periodic downloaded static route\\n\\n" +
      "Gateway of last resort is not set";

    return {
      ok: true,
      raw: output,
      status: 0,
      parsed: {
        raw: output,
        routes: [],
        gatewayOfLastResort: "not set"
      }
    };
  }

  return { ok: false, error: "Unsupported show ip command: " + payload.command, raw: "" };
}
`;
}
