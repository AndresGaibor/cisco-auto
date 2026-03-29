import { type DeviceCapabilities } from "../capabilities/pt-capability-resolver";

export function planTrunkConfig(
  caps: DeviceCapabilities,
  port: string,
  vlans: string[]
): string[] {
  const commands: string[] = [];

  if (caps.supportsTrunkEncapsulation) {
    commands.push("switchport trunk encapsulation dot1q");
  }

  commands.push("switchport mode trunk");
  commands.push(`switchport trunk allowed vlan ${vlans.join(",")}`);

  return commands;
}

export function planSubinterfaceConfig(
  caps: DeviceCapabilities,
  parentInterface: string,
  vlanId: number,
  ip: string,
  mask: string
): string[] | null {
  if (!caps.supportsSubinterfaces) {
    return null;
  }

  const commands: string[] = [];
  commands.push(`interface ${parentInterface}.${vlanId}`);

  if (caps.supportsDot1qEncapsulation) {
    commands.push(`encapsulation dot1q ${vlanId}`);
  }

  commands.push(`ip address ${ip} ${mask}`);

  return commands;
}

export function planSviConfig(
  caps: DeviceCapabilities,
  vlanId: number,
  ip: string,
  mask: string
): string[] | null {
  if (!caps.supportsSvi) {
    return null;
  }

  const commands: string[] = [];
  commands.push(`interface Vlan${vlanId}`);
  commands.push(`ip address ${ip} ${mask}`);

  if (caps.supportsIpRouting) {
    commands.push("ip routing");
  }

  return commands;
}

export function planDhcpRelayConfig(
  caps: DeviceCapabilities,
  interfaceName: string,
  helperAddress: string
): string[] | null {
  if (!caps.supportsDhcpRelay) {
    return null;
  }

  return [`interface ${interfaceName}`, `ip helper-address ${helperAddress}`];
}

export function planStaticRoute(
  caps: DeviceCapabilities,
  network: string,
  mask: string,
  nextHop: string
): string[] | null {
  if (!caps.supportsIpRouting) {
    return null;
  }

  return [`ip route ${network} ${mask} ${nextHop}`];
}
