/**
 * VALIDADOR POST-DEPLOY
 * Ejecuta validaciones después del despliegue
 */

import { SSHConnector } from '../connector/ssh-connector';
import type { 
  ConnectionCredentials, 
  ValidationResult, 
  ValidationCheck,
  ValidationSpec 
} from './types';
import type { DeviceSpec } from '../canonical';

export interface DeviceValidationSpec {
  device: DeviceSpec;
  credentials: ConnectionCredentials;
  checks: {
    ping?: { destination: string; expected: boolean }[];
    interfaces?: { name: string; expectedUp: boolean }[];
    vlans?: { id: number; name?: string }[];
    routing?: { destination: string }[];
  };
}

export class ValidationExecutor {
  /**
   * Valida un dispositivo después del despliegue
   */
  async validate(spec: DeviceValidationSpec): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];
    
    // Crear conector
    const device = {
      name: spec.device.name,
      type: spec.device.type as any,
      management: {
        ip: spec.credentials.host,
        gateway: ''
      },
      credentials: {
        username: spec.credentials.username,
        password: spec.credentials.password
      }
    };
    
    const connector = new SSHConnector(device as any);
    
    try {
      await connector.connect();
      
      // Ejecutar validaciones de ping
      if (spec.checks.ping) {
        for (const ping of spec.checks.ping) {
          checks.push(await this.validatePing(connector, ping.destination, ping.expected));
        }
      }
      
      // Ejecutar validaciones de interfaces
      if (spec.checks.interfaces) {
        for (const iface of spec.checks.interfaces) {
          checks.push(await this.validateInterface(connector, iface.name, iface.expectedUp));
        }
      }
      
      // Ejecutar validaciones de VLANs
      if (spec.checks.vlans) {
        for (const vlan of spec.checks.vlans) {
          checks.push(await this.validateVlan(connector, vlan.id, vlan.name));
        }
      }
      
      // Ejecutar validaciones de routing
      if (spec.checks.routing) {
        for (const route of spec.checks.routing) {
          checks.push(await this.validateRoute(connector, route.destination));
        }
      }
      
    } catch (error: any) {
      checks.push({
        name: 'Connection',
        type: 'interface',
        target: spec.credentials.host,
        expected: 'Connected',
        actual: 'Failed',
        passed: false,
        message: error.message
      });
    } finally {
      await connector.disconnect();
    }
    
    return {
      passed: checks.every(c => c.passed),
      checks
    };
  }

  /**
   * Valida conectividad via ping
   */
  private async validatePing(
    connector: SSHConnector,
    destination: string,
    expected: boolean
  ): Promise<ValidationCheck> {
    try {
      const result = await connector.execCommand(`ping ${destination} repeat 2`);
      const output = result.stdout || '';
      
      // Detectar éxito del ping
      const success = output.includes('!!!') || 
                      output.includes('Success rate is 100 percent') ||
                      output.includes('!!!!');
      
      return {
        name: `Ping to ${destination}`,
        type: 'ping',
        target: destination,
        expected: expected ? 'Success' : 'Failure',
        actual: success ? 'Success' : 'Failure',
        passed: success === expected,
        message: success ? 'Ping successful' : 'Ping failed'
      };
    } catch (error: any) {
      return {
        name: `Ping to ${destination}`,
        type: 'ping',
        target: destination,
        expected: expected ? 'Success' : 'Failure',
        actual: 'Error',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Valida estado de interfaz
   */
  private async validateInterface(
    connector: SSHConnector,
    interfaceName: string,
    expectedUp: boolean
  ): Promise<ValidationCheck> {
    try {
      const result = await connector.execCommand(`show interface ${interfaceName}`);
      const output = result.stdout || '';
      
      // Detectar estado de la interfaz
      const isUp = (output.includes('is up') || output.includes('line protocol is up')) &&
                   !output.includes('administratively down');
      
      return {
        name: `Interface ${interfaceName}`,
        type: 'interface',
        target: interfaceName,
        expected: expectedUp ? 'up' : 'down',
        actual: isUp ? 'up' : 'down',
        passed: isUp === expectedUp,
        message: isUp ? 'Interface is up' : 'Interface is down'
      };
    } catch (error: any) {
      return {
        name: `Interface ${interfaceName}`,
        type: 'interface',
        target: interfaceName,
        expected: expectedUp ? 'up' : 'down',
        actual: 'Error',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Valida existencia de VLAN
   */
  private async validateVlan(
    connector: SSHConnector,
    vlanId: number,
    expectedName?: string
  ): Promise<ValidationCheck> {
    try {
      const result = await connector.execCommand('show vlan brief');
      const output = result.stdout || '';
      
      // Buscar la VLAN
      const vlanRegex = new RegExp(`${vlanId}\\s+(\\S+)`, 'i');
      const match = output.match(vlanRegex);
      
      const exists = match !== null;
      const actualName: string = match ? (match[1] ?? 'unknown') : 'not found';

      let passed = exists;
      if (expectedName && exists) {
        passed = actualName.includes(expectedName) || output.includes(expectedName);
      }

      return {
        name: `VLAN ${vlanId}`,
        type: 'vlan',
        target: String(vlanId),
        expected: expectedName || `VLAN ${vlanId} exists`,
        actual: exists ? actualName : 'not found',
        passed,
        message: exists ? `VLAN found: ${actualName}` : 'VLAN not found'
      };
    } catch (error: any) {
      return {
        name: `VLAN ${vlanId}`,
        type: 'vlan',
        target: String(vlanId),
        expected: expectedName || `VLAN ${vlanId} exists`,
        actual: 'Error',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Valida existencia de ruta
   */
  private async validateRoute(
    connector: SSHConnector,
    destination: string
  ): Promise<ValidationCheck> {
    try {
      const result = await connector.execCommand(`show ip route ${destination}`);
      const output = result.stdout || '';
      
      // Verificar si hay ruta
      const hasRoute = !output.includes('% Subnet not in table') &&
                       !output.includes('Network not in table') &&
                       output.length > 10;
      
      // Extraer next-hop si existe
      const nextHopMatch = output.match(/via\s+(\d+\.\d+\.\d+\.\d+)/);
      const nextHop = nextHopMatch ? nextHopMatch[1] : 'directly connected';
      
      return {
        name: `Route to ${destination}`,
        type: 'routing',
        target: destination,
        expected: 'Route exists',
        actual: hasRoute ? `via ${nextHop}` : 'No route',
        passed: hasRoute,
        message: hasRoute ? `Route found via ${nextHop}` : 'No route found'
      };
    } catch (error: any) {
      return {
        name: `Route to ${destination}`,
        type: 'routing',
        target: destination,
        expected: 'Route exists',
        actual: 'Error',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Valida múltiples dispositivos en paralelo
   */
  async validateAll(
    specs: DeviceValidationSpec[],
    concurrency: number = 5
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();
    
    // Procesar en lotes
    for (let i = 0; i < specs.length; i += concurrency) {
      const batch = specs.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(async spec => {
          const result = await this.validate(spec);
          return [spec.device.name, result] as [string, ValidationResult];
        })
      );
      
      for (const [name, result] of batchResults) {
        results.set(name, result);
      }
    }
    
    return results;
  }
}

/**
 * Genera especificación de validación automática desde un LabSpec
 */
export function generateValidationSpec(
  device: DeviceSpec,
  credentials: ConnectionCredentials
): DeviceValidationSpec {
  const checks: DeviceValidationSpec['checks'] = {};
  
  // Validar interfaces que deberían estar up
  if (device.interfaces) {
    checks.interfaces = device.interfaces
      .filter(i => !i.shutdown)
      .map(i => ({
        name: i.name,
        expectedUp: !i.shutdown
      }));
  }
  
  // Validar VLANs si es switch
  if (device.type === 'switch' || device.type === 'multilayer-switch') {
    // Extraer VLANs de interfaces
    const vlans = new Set<number>();
    device.interfaces?.forEach(i => {
      if (i.vlan) {
        vlans.add(i.vlan);
      }
    });

    checks.vlans = Array.from(vlans).map(id => ({ id }));
  }
  
  return {
    device,
    credentials,
    checks
  };
}
