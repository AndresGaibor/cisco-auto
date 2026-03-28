import { BaseDevice } from './BaseDevice.ts';
import { CableType } from './CableTypes.ts';
import { NetworkUtils } from './NetworkUtils.ts';

export class ValidationEngine {
  /**
   * Valida si un cable es compatible con un puerto basado en su nombre
   */
  public static validateCableCompatibility(portName: string, cableType: CableType): void {
    const name = portName.toLowerCase();
    const cable = cableType.toLowerCase();

    // Regla: Puertos Serial solo aceptan cables Serial
    if (name.includes('serial') && !cable.includes('serial')) {
      throw new Error(`[Física] El puerto ${portName} es Serial y no acepta el cable ${cableType}`);
    }

    // Regla: Puertos de Fibra solo aceptan cables de Fibra
    if (name.includes('fiber') && !cable.includes('fiber')) {
      throw new Error(`[Física] El puerto ${portName} requiere cable de Fibra Óptica`);
    }

    // Regla: Puertos FastEthernet/Gigabit (Cobre) no aceptan Fibra directamente
    if ((name.includes('fastethernet') || name.includes('gigabit')) && !name.includes('fiber') && cable.includes('fiber')) {
      throw new Error(`[Física] No puedes conectar un cable de Fibra en un puerto de Cobre (${portName})`);
    }

    // Regla: El cable de consola solo va al puerto Console o RS232
    if (cable.includes('rollover') || cable.includes('console')) {
      if (!name.includes('console') && !name.includes('rs 232')) {
        throw new Error(`[Física] El cable de Consola solo puede conectarse a puertos Console o RS 232`);
      }
    }
  }

  /**
   * Valida consistencia lógica de subred entre IP y Gateway
   */
  public static validateSubnetConsistency(ip: string, mask: string, gateway?: string): void {
    if (!NetworkUtils.isValidIp(ip)) throw new Error(`[Lógica] Dirección IP inválida: ${ip}`);
    if (!NetworkUtils.isValidMask(mask)) throw new Error(`[Lógica] Máscara de subred inválida: ${mask}`);

    if (gateway) {
      if (!NetworkUtils.isValidIp(gateway)) throw new Error(`[Lógica] IP de Gateway inválida: ${gateway}`);
      
      const netAddress = NetworkUtils.getNetworkAddress(ip, mask);
      const gwAddress = NetworkUtils.getNetworkAddress(gateway, mask);

      if (netAddress !== gwAddress) {
        throw new Error(`[Lógica] Conflicto de Red: El Gateway (${gateway}) no pertenece a la subred de la IP ${ip}/${NetworkUtils.maskToCidr(mask)} (Red: ${netAddress})`);
      }
    }
  }

  /**
   * Valida conflictos de IP en la red
   */
  public static validateIpConflict(devices: BaseDevice[], newIp: string, deviceName: string): void {
    // Pendiente: Implementar verificación global de IPs
  }
}
