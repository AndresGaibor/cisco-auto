import { vlanSchema, type VlanConfigInput, type VlanConfig, sviSchema, type SviConfigInput } from './vlan.schema.js';
import { parseVlanName } from '../../domain/ios/value-objects/vlan-name.vo.js';
import { buildValidationResult } from '../shared/validation.utils.js';

/**
 * Comandos de verificación para validación de VLAN.
 */
export const VLAN_VERIFY_COMMANDS = ['show vlan brief'] as const;

/**
 * Comandos de verificación para validación de SVIs.
 */
export const SVI_VERIFY_COMMANDS = ['show ip interface brief', 'show running-config | include interface Vlan'] as const;

/**
 * Genera comandos IOS para configurar VLANs, trunks y puertos de acceso.
 * Transforma la configuración de alto nivel a comandos IOS específicos.
 * 
 * @param spec - Configuración de VLANs input
 * @returns Array de comandos IOS listos para ejecutar
 * 
 * @example
 * const commands = generateVlanCommands({
 *   switchName: 'SW1',
 *   vlans: [{ id: 10, name: 'USERS' }],
 *   accessPorts: [{ port: 'FastEthernet0/1', vlan: 10 }]
 * });
 */
export function generateVlanCommands(spec: VlanConfigInput): string[] {
  const config = vlanSchema.parse(spec);
  const commands: string[] = [];

  for (const vlan of config.vlans) {
    commands.push(`vlan ${vlan.id.toNumber()}`);

    if (vlan.name) {
      commands.push(`name ${parseVlanName(vlan.name).value}`);
    }

    commands.push('exit');
  }

  for (const port of config.trunkPorts ?? []) {
    commands.push(`interface ${port}`);
    commands.push('switchport mode trunk');
    commands.push('exit');
  }

  for (const accessPort of config.accessPorts ?? []) {
    commands.push(`interface ${accessPort.port}`);
    commands.push('switchport mode access');
    commands.push(`switchport access vlan ${accessPort.vlan.toNumber()}`);
    commands.push('exit');
  }

  return commands;
}

export function verifyShowVlanBriefOutput(output: string, spec: VlanConfigInput) {
  const config: VlanConfig = vlanSchema.parse(spec);
  const outputLines = output.split(/\r?\n/);
  const vlanLines = new Map<number, string>();

  for (const line of outputLines) {
    const match = line.match(/^\s*(\d+)\s+/);

    if (match) {
      vlanLines.set(Number(match[1]), line);
    }
  }

  const errors = config.vlans.flatMap((vlan, index) => {
    const vlanId = vlan.id.toNumber();
    const line = vlanLines.get(vlanId);

    if (!line) {
      return [{
        path: `vlans.${index}.id`,
        message: `VLAN ${vlanId} is missing from show vlan brief`,
        code: 'missing_vlan',
      }];
    }

    const lineTokens = line.trim().split(/\s+/);
    const vlanName = lineTokens[1];

    if (vlan.name && vlanName !== vlan.name) {
      return [{
        path: `vlans.${index}.name`,
        message: `VLAN ${vlanId} name ${vlan.name} is missing from show vlan brief`,
        code: 'missing_vlan_name',
      }];
    }

    return [];
  });

  return buildValidationResult(errors);
}

export function generateSviCommands(spec: SviConfigInput): string[] {
  const config = sviSchema.parse(spec);
  const commands: string[] = [];

  if (config.ipRouting) {
    commands.push('ip routing');
  }

  for (const svi of config.svis) {
    commands.push(`interface Vlan${svi.vlanId.toNumber()}`);
    if (svi.description) {
      commands.push(`description ${svi.description}`);
    }
    commands.push(`ip address ${svi.ipAddress} ${svi.subnetMask}`);
    if (!svi.shutdown) {
      commands.push('no shutdown');
    }
    commands.push('exit');
  }

  return commands;
}

/**
 * Verifica el output de 'show ip interface brief' contra la configuración de SVIs.
 * Valida que cada SVI configurada aparezca con su IP correcta.
 * 
 * @param output - Output del comando 'show ip interface brief'
 * @param spec - Configuración original de SVIs
 * @returns Resultado de validación con errores si hay SVIs faltantes
 */
export function verifyShowIpInterfaceBrief(output: string, spec: SviConfigInput) {
  const config = sviSchema.parse(spec);
  const lines = output.split(/\r?\n/);
  const errors: Array<{ path: string; message: string; code: string }> = [];

  for (const [index, svi] of config.svis.entries()) {
    const vlanNum = svi.vlanId.toNumber();
    const found = lines.some(
      (line) => line.includes(`Vlan${vlanNum}`) && line.includes(svi.ipAddress)
    );

    if (!found) {
      errors.push({
        path: `svis.${index}`,
        message: `SVI Vlan${vlanNum} con IP ${svi.ipAddress} no encontrada`,
        code: 'svi_not_found',
      });
    }
  }

  return buildValidationResult(errors);
}
