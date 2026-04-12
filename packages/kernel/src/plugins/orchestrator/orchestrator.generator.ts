import {
  deviceConfigSpecSchema,
  sviSchema,
  type DeviceConfigSpec,
  type DeviceConfigSpecInput,
  type SviConfigInput,
} from './orchestrator.schema.js';

export const SECTION_ORDER = [
  'basic',
  'vlan',
  'vtp',
  'stp',
  'etherchannel',
  'svi',
  'routing',
  'security',
  'services',
] as const;

export type SectionName = typeof SECTION_ORDER[number];

export async function orchestrateConfig(spec: DeviceConfigSpecInput): Promise<string[]> {
  deviceConfigSpecSchema.parse(spec);
  const commands: string[] = [];

  for (const section of SECTION_ORDER) {
    switch (section) {
      case 'basic':
        if (spec.basic) {
          const { generateBasicCommands } = await import('../basic-config/basic-config.generator.js');
          commands.push(
            ...generateBasicCommands({
              ...spec.basic,
              deviceName: spec.deviceName,
              hostname: spec.basic.hostname ?? spec.deviceName,
            })
          );
        }
        break;

      case 'vlan':
        if (spec.vlan) {
          const { generateVlanCommands } = await import('../vlan/vlan.generator.js');
          commands.push(
            ...generateVlanCommands({
              ...spec.vlan,
              switchName: spec.deviceName,
              vlans: spec.vlan.vlans ?? [],
            })
          );
        }
        break;

      case 'vtp':
        if (spec.vtp) {
          const { generateVtpCommands } = await import('../switching/switching.generator.js');
          commands.push(...generateVtpCommands(spec.vtp));
        }
        break;

      case 'stp':
        if (spec.stp) {
          const { generateStpCommands } = await import('../switching/switching.generator.js');
          commands.push(...generateStpCommands(spec.stp));
        }
        break;

      case 'etherchannel':
        if (spec.etherchannel) {
          const { generateEtherChannelCommands } = await import('../switching/switching.generator.js');
          commands.push(...generateEtherChannelCommands(spec.etherchannel));
        }
        break;

      case 'svi':
        if (spec.svi) {
          commands.push(...generateSviCommands({ ...spec.svi, deviceName: spec.deviceName, svis: spec.svi.svis ?? [] }));
        }
        break;

      case 'routing':
        if (spec.routing) {
          const { generateRoutingCommands } = await import('../routing/routing.generator.js');
          commands.push(
            ...generateRoutingCommands({
              ...spec.routing,
              deviceName: spec.deviceName,
            })
          );
        }
        break;

      case 'security':
        if (spec.security) {
          const { generateSecurityCommands } = await import('../security/security.generator.js');
          commands.push(
            ...generateSecurityCommands({
              ...spec.security,
              deviceName: spec.deviceName,
            })
          );
        }
        break;

      case 'services':
        if (spec.services) {
          const { generateServicesCommands } = await import('../services/services.generator.js');
          commands.push(
            ...generateServicesCommands({
              ...spec.services,
              deviceName: spec.deviceName,
            })
          );
        }
        break;
    }
  }

  return commands;
}

export function generateSviCommands(spec: SviConfigInput): string[] {
  const config = sviSchema.parse(spec);
  const commands: string[] = [];

  for (const svi of config.svis) {
    commands.push(`interface Vlan${svi.vlanId}`);

    if (svi.description) {
      commands.push(` description ${svi.description}`);
    }

    commands.push(` ip address ${svi.ipAddress} ${svi.subnetMask}`);
    commands.push(' no shutdown');
    commands.push(' exit');
  }

  return commands;
}

export function verifyOrchestratedConfig(output: string, spec: DeviceConfigSpecInput) {
  deviceConfigSpecSchema.parse(spec);
  const errors: Array<{ path: string; message: string; code: string }> = [];

  if (spec.basic?.hostname) {
    const hasHostname = output.includes(`hostname ${spec.basic.hostname}`);
    if (!hasHostname) {
      errors.push({
        path: 'basic.hostname',
        message: `Hostname ${spec.basic.hostname} no encontrado`,
        code: 'hostname_not_found',
      });
    }
  }

  if (spec.vlan?.vlans) {
    for (const [index, vlan] of spec.vlan.vlans.entries()) {
      const vlanNum = typeof vlan.id === 'number' ? vlan.id : parseInt(String(vlan.id), 10);
      const hasVlan = output.includes(`vlan ${vlanNum}`);
      if (!hasVlan) {
        errors.push({
          path: `vlan.vlans.${index}.id`,
          message: `VLAN ${vlanNum} no encontrada en la configuración`,
          code: 'vlan_not_found',
        });
      }
    }
  }

  if (spec.svi?.svis) {
    for (const [index, svi] of spec.svi.svis.entries()) {
      const hasSvi = output.includes(`interface Vlan${svi.vlanId}`);
      if (!hasSvi) {
        errors.push({
          path: `svi.svis.${index}.vlanId`,
          message: `SVI VLAN ${svi.vlanId} no encontrado`,
          code: 'svi_not_found',
        });
      }
    }
  }

  if (spec.stp?.mode) {
    const hasStpMode = output.includes(`spanning-tree mode ${spec.stp.mode}`);
    if (!hasStpMode) {
      errors.push({
        path: 'stp.mode',
        message: `STP mode ${spec.stp.mode} no encontrado`,
        code: 'stp_mode_not_found',
      });
    }
  }

  if (spec.vtp?.mode) {
    const hasVtpMode = output.includes(`vtp mode ${spec.vtp.mode}`);
    if (!hasVtpMode) {
      errors.push({
        path: 'vtp.mode',
        message: `VTP mode ${spec.vtp.mode} no encontrado`,
        code: 'vtp_mode_not_found',
      });
    }
  }

  if (spec.routing?.staticRoutes) {
    for (const [index, route] of spec.routing.staticRoutes.entries()) {
      const hasRoute = output.includes(`ip route ${route.network}`);
      if (!hasRoute) {
        errors.push({
          path: `routing.staticRoutes.${index}.network`,
          message: `Ruta estática ${route.network} no encontrada`,
          code: 'static_route_not_found',
        });
      }
    }
  }

  if (spec.security?.acls) {
    for (const [index, acl] of spec.security.acls.entries()) {
      const hasAcl = output.includes(`access-list ${acl.name}`);
      if (!hasAcl) {
        errors.push({
          path: `security.acls.${index}.name`,
          message: `ACL ${acl.name} no encontrada`,
          code: 'acl_not_found',
        });
      }
    }
  }

  if (spec.services?.dhcp) {
    for (const [index, pool] of spec.services.dhcp.entries()) {
      const hasPool = output.includes(`ip dhcp pool ${pool.name}`);
      if (!hasPool) {
        errors.push({
          path: `services.dhcp.${index}.name`,
          message: `DHCP pool ${pool.name} no encontrado`,
          code: 'dhcp_pool_not_found',
        });
      }
    }
  }

  if (spec.services?.ntp?.servers) {
    for (const [index, server] of spec.services.ntp.servers.entries()) {
      const hasNtp = output.includes(`ntp server ${server.ip}`);
      if (!hasNtp) {
        errors.push({
          path: `services.ntp.servers.${index}.ip`,
          message: `NTP server ${server.ip} no encontrado`,
          code: 'ntp_server_not_found',
        });
      }
    }
  }

  if (spec.basic?.ssh?.domainName) {
    const hasDomain = output.includes(`ip domain-name ${spec.basic.ssh.domainName}`);
    if (!hasDomain) {
      errors.push({
        path: 'basic.ssh.domainName',
        message: `Dominio SSH ${spec.basic.ssh.domainName} no encontrado`,
        code: 'ssh_domain_not_found',
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
