/**
 * WLC Use Cases
 *
 * Casos de uso para Wireless LAN Controller.
 * Elega la ejecución de JS en el motor PT a través de omniscience.
 */

import type {
  WlcDeviceState,
  WlcNetworkSetupResult,
  WlcDeviceStatusResult,
  WlcIpConfigResult,
  WlcUseCaseResult,
} from "./wlc-types.js";

const STATUS_QUERY_JS = `
(function() {
  var net = ipc.network();
  var devs = ['PC0', 'WLC1', 'SW1', 'AAA_Server', 'AP1', 'AP2', 'AP3'];
  var report = [];
  devs.forEach(function(name) {
    var d = net.getDevice(name);
    if (d) {
      var portsUp = [];
      var portsDown = [];
      for (var i = 0; i < d.getPortCount(); i++) {
        var p = d.getPortAt(i);
        if (p) {
          if (p.isPortUp()) portsUp.push(p.getName());
          else portsDown.push(p.getName());
        }
      }
      var ip = '';
      try {
        var mgmt = d.getPort('management') || d.getPort('FastEthernet0') || d.getPort('Vlan1');
        if (mgmt) ip = mgmt.getIpAddress();
      } catch(e) {}
      report.push({ name: name, power: d.getPower(), model: d.getModel(), portsUp: portsUp, portsDown: portsDown, ip: ip });
    }
  });
  return JSON.stringify(report);
})()
`;

const SETUP_CODE_JS = `
(function() {
  var net = ipc.network();
  var devs = ['PC0', 'WLC1', 'SW1', 'AAA_Server', 'AP1', 'AP2', 'AP3'];
  var configured = [];
  var errors = [];

  devs.forEach(function(name) {
    try {
      var d = net.getDevice(name);
      if (d && !d.getPower()) {
        if (d.getModel && d.getModel().includes('LAP')) {
          try { d.getRootModule().addModuleAt('ACCESS_POINT_POWER_ADAPTER', 1); } catch(e) {}
        }
        d.setPower(true);
        configured.push(name + ' (powered)');
      }
    } catch(e) { errors.push(name + ': ' + e.message); }
  });

  try {
    var sw = net.getDevice('SW1');
    ['FastEthernet0/3', 'FastEthernet0/4', 'FastEthernet0/5'].forEach(function(port) {
      try { if (sw.getPort(port)) sw.getPort(port).setPower(true); } catch(e) {}
    });
    configured.push('SW1 PoE (Fa0/3, Fa0/4, Fa0/5)');
  } catch(e) { errors.push('SW1: ' + e.message); }

  try {
    var wlc = net.getDevice('WLC1');
    var mgmt = wlc.getPort('management');
    mgmt.setIpSubnetMask('192.168.10.2', '255.255.255.0');
    mgmt.setDefaultGateway('192.168.10.1');
    configured.push('WLC1 (192.168.10.2/24)');
  } catch(e) { errors.push('WLC1: ' + e.message); }

  try {
    var sw = net.getDevice('SW1');
    var svi = sw.getPort('Vlan10');
    svi.setIpSubnetMask('192.168.10.1', '255.255.255.0');
    configured.push('SW1 Vlan10 (192.168.10.1/24)');
  } catch(e) { errors.push('SW1 Vlan10: ' + e.message); }

  return JSON.stringify({ success: errors.length === 0, configured: configured, errors: errors });
})()
`;

export interface WlcOmnisciencePort {
  evaluate(code: string): Promise<unknown>;
}

function parseDeviceStates(raw: unknown): WlcDeviceState[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>).map((d) => ({
    name: String(d.name ?? ""),
    model: String(d.model ?? ""),
    powered: Boolean(d.power),
    portsUp: Array.isArray(d.portsUp) ? d.portsUp.map(String) : [],
    portsDown: Array.isArray(d.portsDown) ? d.portsDown.map(String) : [],
    ip: d.ip ? String(d.ip) : undefined,
  }));
}

export interface WlcPort {
  omniscience: WlcOmnisciencePort;
}

export async function setupWlcNetwork(
  port: WlcPort,
): Promise<WlcUseCaseResult<WlcNetworkSetupResult>> {
  try {
    const raw = await port.omniscience.evaluate(SETUP_CODE_JS);
    const parsed = JSON.parse(String(raw));

    const success = Boolean(parsed.success);
    if (success) {
      return {
        ok: true as const,
        data: {
          success: true,
          configured: Array.isArray(parsed.configured)
            ? parsed.configured.map(String)
            : [],
          errors: [],
        },
        advice: ["Usa pt wlc status para verificar el estado final"],
      };
    } else {
      return {
        ok: false as const,
        error: {
          message: Array.isArray(parsed.errors) ? parsed.errors[0] : "Setup failed",
          details: { errors: parsed.errors },
        },
      };
    }
  } catch (error) {
    return {
      ok: false as const,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function getWlcNetworkStatus(
  port: WlcPort,
): Promise<WlcUseCaseResult<WlcDeviceStatusResult>> {
  try {
    const raw = await port.omniscience.evaluate(STATUS_QUERY_JS);
    const states = parseDeviceStates(JSON.parse(String(raw)));

    return {
      ok: true as const,
      data: {
        devices: states,
        allPowered: states.every((d) => d.powered),
        allConnected: states.length > 0 && states.every((d) => d.portsUp.length > 0),
      },
    };
  } catch (error) {
    return {
      ok: false as const,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function configureWlcIp(
  port: WlcPort,
  ip: string,
  mask: string,
  gateway: string,
): Promise<WlcUseCaseResult<WlcIpConfigResult>> {
  try {
    const code = `
(function() {
  var net = ipc.network();
  var wlc = net.getDevice('WLC1');
  var mgmt = wlc.getPort('management');
  mgmt.setIpSubnetMask('${ip}', '${mask}');
  mgmt.setDefaultGateway('${gateway}');
  return 'WLC management set to ${ip}/${mask}, gateway ${gateway}';
})()
`;
    await port.omniscience.evaluate(code);

    return {
      ok: true as const,
      data: { ip, mask, gateway },
      advice: [`Usa pt wlc status para verificar la IP ${ip}`],
    };
  } catch (error) {
    return {
      ok: false as const,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function configureWlcGateway(
  port: WlcPort,
  ip: string,
): Promise<WlcUseCaseResult<{ ip: string }>> {
  try {
    const code = `
(function() {
  var net = ipc.network();
  var wlc = net.getDevice('WLC1');
  var mgmt = wlc.getPort('management');
  mgmt.setDefaultGateway('${ip}');
  return 'WLC gateway set to ${ip}';
})()
`;
    await port.omniscience.evaluate(code);

    return {
      ok: true as const,
      data: { ip },
    };
  } catch (error) {
    return {
      ok: false as const,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function enablePoE(
  port: WlcPort,
  switchName: string,
  portName: string,
): Promise<WlcUseCaseResult<{ switch: string; port: string }>> {
  try {
    const code = `
(function() {
  var net = ipc.network();
  var sw = net.getDevice('${switchName}');
  var p = sw.getPort('${portName}');
  p.setPower(true);
  return 'PoE enabled on ${switchName}:${portName}';
})()
`;
    await port.omniscience.evaluate(code);

    return {
      ok: true as const,
      data: { switch: switchName, port: portName },
    };
  } catch (error) {
    return {
      ok: false as const,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function addApPowerAdapter(
  port: WlcPort,
  apName: string,
): Promise<WlcUseCaseResult<{ ap: string }>> {
  try {
    const code = `
(function() {
  var net = ipc.network();
  var d = net.getDevice('${apName}');
  var rm = d.getRootModule();
  var result = rm.addModuleAt('ACCESS_POINT_POWER_ADAPTER', 1);
  return result ? 'success' : 'failed';
})()
`;
    const raw = await port.omniscience.evaluate(code);
    const success = String(raw).includes("success");

    if (!success) {
      return {
        ok: false as const,
        error: { message: `Falló al agregar power adapter a ${apName}` },
      };
    }

    return {
      ok: true as const,
      data: { ap: apName },
      advice: [`Usa pt wlc status para verificar ${apName}`],
    };
  } catch (error) {
    return {
      ok: false as const,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function configureSwitchSvi(
  port: WlcPort,
  switchName: string,
  vlanId: string,
  ip: string,
  mask: string,
): Promise<WlcUseCaseResult<{ switch: string; vlan: string; ip: string }>> {
  try {
    const code = `
(function() {
  var net = ipc.network();
  var sw = net.getDevice('${switchName}');
  var svi = sw.getPort('Vlan${vlanId}');
  svi.setIpSubnetMask('${ip}', '${mask}');
  return '${switchName} Vlan${vlanId} set to ${ip}/${mask}';
})()
`;
    await port.omniscience.evaluate(code);

    return {
      ok: true as const,
      data: { switch: switchName, vlan: vlanId, ip: `${ip}/${mask}` },
      advice: [`Usa pt show ip-int-brief ${switchName} para verificar`],
    };
  } catch (error) {
    return {
      ok: false as const,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}