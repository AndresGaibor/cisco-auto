import {
  stpSchema,
  vtpSchema,
  etherChannelSchema,
  type StpConfigInput,
  type VtpConfigInput,
  type EtherChannelConfigInput,
} from './switching.schema.js';

export const SWITCHING_VERIFY_COMMANDS = [
  'show spanning-tree summary',
  'show vtp status',
  'show etherchannel summary',
] as const;

// =============================================================================
// STP COMMAND GENERATOR
// =============================================================================

export function generateStpCommands(spec: StpConfigInput): string[] {
  const config = stpSchema.parse(spec);
  const commands: string[] = [];

  commands.push('! Spanning Tree Protocol Configuration');

  // Modo de STP
  commands.push(`spanning-tree mode ${config.mode}`);

  // Prioridad global
  if (config.priority !== undefined) {
    commands.push(`spanning-tree vlan 1-4094 priority ${config.priority}`);
  }

  // Configuración por VLAN
  for (const vlanConf of config.vlanConfig ?? []) {
    if (vlanConf.priority !== undefined) {
      commands.push(`spanning-tree vlan ${vlanConf.vlanId} priority ${vlanConf.priority}`);
    }
    if (vlanConf.rootPrimary) {
      commands.push(`spanning-tree vlan ${vlanConf.vlanId} root primary`);
    }
    if (vlanConf.rootSecondary) {
      commands.push(`spanning-tree vlan ${vlanConf.vlanId} root secondary`);
    }
  }

  // Root primary/secondary para VLANs
  if (config.rootPrimary && config.rootPrimary.length > 0) {
    commands.push(`spanning-tree vlan ${config.rootPrimary.join(',')} root primary`);
  }

  if (config.rootSecondary && config.rootSecondary.length > 0) {
    commands.push(`spanning-tree vlan ${config.rootSecondary.join(',')} root secondary`);
  }

  // Configuraciones globales
  if (config.portfastDefault) {
    commands.push('spanning-tree portfast default');
  }

  if (config.bpduguardDefault) {
    commands.push('spanning-tree portfast bpduguard default');
  }

  if (config.bpdufilterDefault) {
    commands.push('spanning-tree portfast bpdufilter default');
  }

  // Configuración de interfaces
  for (const ifaceConf of config.interfaceConfig ?? []) {
    commands.push(`interface ${ifaceConf.interface}`);

    if (ifaceConf.portfast !== undefined) {
      commands.push(ifaceConf.portfast ? ' spanning-tree portfast' : ' no spanning-tree portfast');
    }

    if (ifaceConf.bpduguard !== undefined) {
      commands.push(ifaceConf.bpduguard ? ' spanning-tree bpduguard enable' : ' spanning-tree bpduguard disable');
    }

    if (ifaceConf.bpdufilter !== undefined) {
      commands.push(ifaceConf.bpdufilter ? ' spanning-tree bpdufilter enable' : ' spanning-tree bpdufilter disable');
    }

    if (ifaceConf.cost !== undefined) {
      commands.push(` spanning-tree cost ${ifaceConf.cost}`);
    }

    if (ifaceConf.portPriority !== undefined) {
      commands.push(` spanning-tree port-priority ${ifaceConf.portPriority}`);
    }

    if (ifaceConf.linkType !== undefined) {
      commands.push(` spanning-tree link-type ${ifaceConf.linkType}`);
    }

    commands.push(' exit');
  }

  return commands;
}

// =============================================================================
// VTP COMMAND GENERATOR
// =============================================================================

export function generateVtpCommands(spec: VtpConfigInput): string[] {
  const config = vtpSchema.parse(spec);
  const commands: string[] = [];

  commands.push('! VTP Configuration');
  commands.push(`vtp mode ${config.mode}`);

  if (config.domain !== undefined) {
    commands.push(`vtp domain ${config.domain}`);
  }

  if (config.password !== undefined) {
    commands.push(`vtp password ${config.password}`);
  }

  if (config.version !== undefined) {
    commands.push(`vtp version ${config.version}`);
  }

  return commands;
}

// =============================================================================
// ETHERCHANNEL COMMAND GENERATOR
// =============================================================================

export function generateEtherChannelCommands(spec: EtherChannelConfigInput): string[] {
  const config = etherChannelSchema.parse(spec);
  const commands: string[] = [];

  commands.push('! EtherChannel Configuration');

  if (config.description !== undefined) {
    commands.push(`interface ${config.portChannel}`);
    commands.push(` description ${config.description}`);
    commands.push(' exit');
  }

  for (const iface of config.interfaces) {
    commands.push(`interface ${iface}`);
    commands.push(` channel-group ${config.groupId} mode ${config.mode}`);
    commands.push(' exit');
  }

  // Configuración del Port-Channel
  commands.push(`interface ${config.portChannel}`);

  if (config.trunkMode === 'trunk') {
    commands.push(' switchport mode trunk');
    if (config.nativeVlan !== undefined) {
      commands.push(` switchport trunk native vlan ${config.nativeVlan}`);
    }
    if (config.allowedVlans !== undefined) {
      const vlans = config.allowedVlans === 'all' ? 'all' : config.allowedVlans.join(',');
      commands.push(` switchport trunk allowed vlan ${vlans}`);
    }
  } else if (config.trunkMode === 'access') {
    commands.push(' switchport mode access');
    if (config.accessVlan !== undefined) {
      commands.push(` switchport access vlan ${config.accessVlan}`);
    }
  }

  commands.push(' exit');

  return commands;
}

// =============================================================================
// VERIFICATION FUNCTIONS
// =============================================================================

export function verifyShowStpSummary(output: string, spec: StpConfigInput) {
  const config = stpSchema.parse(spec);
  const errors: Array<{ path: string; message: string; code: string }> = [];

  const modeMap = {
    'pvst': 'PVST',
    'rapid-pvst': 'Rapid-PVST',
    'mst': 'MST',
  };

  if (!output.includes(modeMap[config.mode])) {
    errors.push({
      path: 'mode',
      message: `STP mode ${config.mode} is not configured`,
      code: 'missing_stp_mode',
    });
  }

  return { ok: errors.length === 0, errors };
}

export function verifyShowVtpStatus(output: string, spec: VtpConfigInput) {
  const config = vtpSchema.parse(spec);
  const errors: Array<{ path: string; message: string; code: string }> = [];

  const modeUpper = config.mode.charAt(0).toUpperCase() + config.mode.slice(1);
  if (!output.includes(modeUpper)) {
    errors.push({
      path: 'mode',
      message: `VTP mode ${config.mode} is not configured`,
      code: 'missing_vtp_mode',
    });
  }

  if (config.domain !== undefined && !output.includes(config.domain)) {
    errors.push({
      path: 'domain',
      message: `VTP domain ${config.domain} is not configured`,
      code: 'missing_vtp_domain',
    });
  }

  return { ok: errors.length === 0, errors };
}

export function verifyShowEtherchannelSummary(output: string, spec: EtherChannelConfigInput) {
  const config = etherChannelSchema.parse(spec);
  const errors: Array<{ path: string; message: string; code: string }> = [];

  if (!output.includes(config.portChannel)) {
    errors.push({
      path: 'portChannel',
      message: `Port-channel ${config.portChannel} is not configured`,
      code: 'missing_port_channel',
    });
  }

  for (const iface of config.interfaces) {
    if (!output.includes(iface)) {
      errors.push({
        path: 'interfaces',
        message: `Interface ${iface} is not in the EtherChannel`,
        code: 'missing_etherchannel_member',
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
