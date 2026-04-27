export type IosDeviceType = "router" | "switch" | "pc";

export interface IosCommandStrategy {
  readonly deviceType: IosDeviceType;
  readonly supportedCommands: string[];
  dismissSetupCommand(): string | null;
  pressReturnCommand(): string;
  confirmationCommand(): string;
}

class RouterStrategy implements IosCommandStrategy {
  readonly deviceType: IosDeviceType = "router";
  readonly supportedCommands: string[] = [
    "show",
    "config",
    "interface",
    "router",
    "acl",
    "vlan",
    "spanning-tree",
    "etherchannel",
  ];

  dismissSetupCommand(): string {
    return "no";
  }

  pressReturnCommand(): string {
    return "\r\n";
  }

  confirmationCommand(): string {
    return "y";
  }
}

class SwitchStrategy implements IosCommandStrategy {
  readonly deviceType: IosDeviceType = "switch";
  readonly supportedCommands: string[] = [
    "show",
    "config",
    "interface",
    "vlan",
    "spanning-tree",
    "etherchannel",
    "port-security",
  ];

  dismissSetupCommand(): string {
    return "no";
  }

  pressReturnCommand(): string {
    return "\r\n";
  }

  confirmationCommand(): string {
    return "y";
  }
}

class PcStrategy implements IosCommandStrategy {
  readonly deviceType: IosDeviceType = "pc";
  readonly supportedCommands: string[] = [
    "ipconfig",
    "ping",
    "tracert",
    "arp",
    "netstat",
  ];

  dismissSetupCommand(): string | null {
    return null;
  }

  pressReturnCommand(): string {
    return "\r\n";
  }

  confirmationCommand(): string {
    return "y";
  }
}

export function getStrategy(deviceType: IosDeviceType): IosCommandStrategy {
  switch (deviceType) {
    case "router":
      return new RouterStrategy();
    case "switch":
      return new SwitchStrategy();
    case "pc":
      return new PcStrategy();
    default:
      throw new Error(`Unknown device type: ${deviceType}`);
  }
}

export { RouterStrategy, SwitchStrategy, PcStrategy };
