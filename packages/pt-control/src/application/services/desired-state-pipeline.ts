import type { PTController } from "../../controller/index.js";

export interface DesiredPortState {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  defaultGateway?: string;
  vlan?: number;
  mode?: "access" | "trunk";
  description?: string;
  speed?: string;
  duplex?: string;
  mtu?: number;
}

export interface DesiredDeviceState {
  hostname?: string;
  ports?: DesiredPortState[];
  enableSecret?: string;
  banner?: string;
}

export interface DesiredStateResult {
  commands: string[];
  warnings: string[];
  device: string;
}

export interface DesiredStatePipeline {
  generateCommands(
    device: string,
    desired: DesiredDeviceState,
    currentXmlParsed?: unknown,
  ): Promise<DesiredStateResult>;
}

export function createDesiredStatePipeline(controller: PTController): DesiredStatePipeline {
  async function generateCommands(
    device: string,
    desired: DesiredDeviceState,
    currentXmlParsed?: unknown,
  ): Promise<DesiredStateResult> {
    var commands: string[] = [];
    var warnings: string[] = [];

    var current: any = currentXmlParsed;
    if (!current) {
      try {
        var inspected = (await controller.inspectDevice(device, true)) as any;
        current = inspected?.xmlParsed;
      } catch (e) {
        warnings.push("No se pudo obtener estado actual: " + String(e));
        current = null;
      }
    }

    if (desired.hostname && current?.deviceName !== desired.hostname) {
      commands.push("hostname " + desired.hostname);
    }

    if (desired.ports && desired.ports.length > 0) {
      for (var i = 0; i < desired.ports.length; i++) {
        var p = desired.ports[i];
        var portName = p.name;

        if (p.ipAddress || p.subnetMask || p.description || p.speed || p.duplex) {
          commands.push("interface " + portName);
        }

        if (p.description) {
          commands.push("description " + p.description);
        }

        if (p.ipAddress && p.subnetMask) {
          commands.push("ip address " + p.ipAddress + " " + p.subnetMask);
        }

        if (p.vlan !== undefined && p.vlan > 0) {
          if (p.mode === "trunk") {
            commands.push("switchport mode trunk");
            commands.push("switchport trunk allowed vlan " + p.vlan);
          } else {
            commands.push("switchport mode access");
            commands.push("switchport access vlan " + p.vlan);
          }
        }

        if (p.speed) {
          commands.push("speed " + p.speed);
        }

        if (p.duplex) {
          commands.push("duplex " + p.duplex);
        }

        if (p.mtu && p.mtu > 0) {
          commands.push("mtu " + p.mtu);
        }

        if (p.ipAddress || p.subnetMask || p.description || p.speed || p.duplex || p.mtu) {
          commands.push("no shutdown");
        }

        if (p.ipAddress || p.subnetMask || p.description || p.speed || p.duplex || p.mtu) {
          commands.push("exit");
        }
      }

      if (commands.length > 0) {
        commands.unshift("configure terminal");
        commands.push("end");
        commands.push("write memory");
      }
    }

    if (desired.enableSecret) {
      commands.push("enable secret " + desired.enableSecret);
    }

    if (desired.banner) {
      commands.push("banner motd #" + desired.banner + "#");
    }

    return {
      commands: commands,
      warnings: warnings,
      device: device,
    };
  }

  return {
    generateCommands: generateCommands,
  };
}
