/**
 * WlcService - Servicio de automatización para Wireless LAN Controller
 * Maneja configuración de red, power adapters, PoE, y SVI management
 */

import type { RuntimeOmniPort } from "../../ports/runtime-omni-port.js";

export interface DeviceStatus {
  name: string;
  power: boolean;
  portsUp: string[];
  portsDown: string[];
  ip: string;
  model: string;
}

export interface WlcStatus {
  devices: DeviceStatus[];
  linksWorking: number;
  linksTotal: number;
  allPowered: boolean;
  allConnected: boolean;
}

export interface SetupResult {
  success: boolean;
  devicesConfigured: string[];
  errors: string[];
}

function buildStatusQuery(): string {
  return `
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
          report.push({
            name: name,
            power: d.getPower(),
            model: d.getModel(),
            portsUp: portsUp,
            portsDown: portsDown,
            ip: ip
          });
        }
      });
      return JSON.stringify(report);
    })()
  `;
}

export class WlcService {
  constructor(private readonly omniPort: RuntimeOmniPort) {}

  async status(): Promise<WlcStatus> {
    const result = await this.omniPort.runOmniCapability(
      "omni.evaluate.raw",
      { code: buildStatusQuery() }
    );

    if (!result.ok) throw new Error(result.error);
    const devices: DeviceStatus[] = JSON.parse(String(result.value || "[]"));

    return {
      devices,
      linksWorking: devices.reduce((sum, d) => sum + d.portsUp.length, 0),
      linksTotal: devices.reduce((sum, d) => sum + d.portsUp.length + d.portsDown.length, 0),
      allPowered: devices.every(d => d.power),
      allConnected: devices.every(d => d.portsUp.length > 0)
    };
  }

  async setManagementIP(ip: string, mask: string, gateway: string): Promise<void> {
    const code = `
      (function() {
        var net = ipc.network();
        var wlc = net.getDevice('WLC1');
        var mgmt = wlc.getPort('management');
        mgmt.setIpSubnetMask('${ip}', '${mask}');
        mgmt.setDefaultGateway('${gateway}');
        return 'WLC management set to ${ip}';
      })()
    `;
    const result = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code });
    if (!result.ok) throw new Error(result.error);
  }

  async setGateway(gatewayIp: string): Promise<void> {
    const code = `
      (function() {
        var net = ipc.network();
        var wlc = net.getDevice('WLC1');
        var mgmt = wlc.getPort('management');
        mgmt.setDefaultGateway('${gatewayIp}');
        return 'WLC gateway set to ${gatewayIp}';
      })()
    `;
    const result = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code });
    if (!result.ok) throw new Error(result.error);
  }

  async enablePoE(switchName: string, portName: string): Promise<void> {
    const code = `
      (function() {
        var net = ipc.network();
        var sw = net.getDevice('${switchName}');
        var p = sw.getPort('${portName}');
        p.setPower(true);
        return 'PoE enabled on ${switchName}:${portName}';
      })()
    `;
    const result = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code });
    if (!result.ok) throw new Error(result.error);
  }

  async addPowerAdapter(deviceName: string): Promise<boolean> {
    const code = `
      (function() {
        var net = ipc.network();
        var d = net.getDevice('${deviceName}');
        var rm = d.getRootModule();
        var result = rm.addModuleAt('ACCESS_POINT_POWER_ADAPTER', 1);
        return result ? 'success' : 'failed';
      })()
    `;
    const result = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code });
    return result.ok && String(result.value).includes("success");
  }

  async setSvi(switchName: string, vlanId: number, ip: string, mask: string): Promise<void> {
    const code = `
      (function() {
        var net = ipc.network();
        var sw = net.getDevice('${switchName}');
        var svi = sw.getPort('Vlan${vlanId}');
        svi.setIpSubnetMask('${ip}', '${mask}');
        return 'SW ${switchName} Vlan${vlanId} IP set to ${ip}/${mask}';
      })()
    `;
    const result = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code });
    if (!result.ok) throw new Error(result.error);
  }

  async setDevicePower(deviceName: string, powered: boolean): Promise<void> {
    const code = `
      (function() {
        var net = ipc.network();
        var d = net.getDevice('${deviceName}');
        if (d && d.getPower() !== ${powered}) {
          d.setPower(${powered});
          return '${deviceName} power ${powered ? 'on' : 'off'}';
        }
        return '${deviceName} already ${powered ? 'on' : 'off'}';
      })()
    `;
    const result = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code });
    if (!result.ok) throw new Error(result.error);
  }

  async setupNetwork(): Promise<SetupResult> {
    const errors: string[] = [];
    const devicesConfigured: string[] = [];

    try {
      const status = await this.status();

      for (const dev of status.devices) {
        if (!dev.power) {
          if (dev.model.includes('LAP')) {
            await this.addPowerAdapter(dev.name);
          } else {
            await this.setDevicePower(dev.name, true);
          }
          devicesConfigured.push(`${dev.name} (powered)`);
        }
      }

      await this.enablePoE('SW1', 'FastEthernet0/3');
      await this.enablePoE('SW1', 'FastEthernet0/4');
      await this.enablePoE('SW1', 'FastEthernet0/5');
      devicesConfigured.push('SW1 PoE (Fa0/3, Fa0/4, Fa0/5)');

      await this.setManagementIP('192.168.10.2', '255.255.255.0', '192.168.10.1');
      devicesConfigured.push('WLC1 (192.168.10.2/24)');

      await this.setSvi('SW1', 10, '192.168.10.1', '255.255.255.0');
      devicesConfigured.push('SW1 Vlan10 (192.168.10.1/24)');

      return { success: true, devicesConfigured, errors };
    } catch (e: any) {
      errors.push(e.message);
      return { success: false, devicesConfigured, errors };
    }
  }
}