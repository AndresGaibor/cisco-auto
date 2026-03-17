import { BaseDevice } from './BaseDevice.ts';
import { ValidationEngine } from './ValidationEngine.ts';

export class PC extends BaseDevice {
  
  private getNetworkPort(type: 'ethernet' | 'wireless' = 'ethernet'): any {
    return this.findNetworkPort(this.engineNode.MODULE, (p: any) => {
      const pType = String(p.TYPE || "");
      if (type === 'wireless') return pType.includes('Wireless') || pType.includes('WNE');
      return pType.includes('Ethernet') || pType.includes('FE');
    });
  }

  /**
   * Configura la conexión Wi-Fi de la PC
   */
  public connectToSSID(ssid: string, passphrase?: string): void {
    const port = this.getNetworkPort('wireless');
    if (port) {
      if (!port.WIRELESS_SETTINGS) port.WIRELESS_SETTINGS = {};
      port.WIRELESS_SETTINGS.SSID = ssid;
      if (passphrase) {
        port.WIRELESS_SETTINGS.AUTHENTICATION_TYPE = '4'; // WPA2
        port.WIRELESS_SETTINGS.PASSPHRASE = passphrase;
      }
      console.log(`   [PC ${this.getName()}] Asociada al SSID: ${ssid}`);
    } else {
      console.warn(`   [PC ${this.getName()}] No tiene tarjeta inalámbrica instalada.`);
    }
  }

  public setIpAddress(ip: string, subnet: string): void {
    // VALIDACIÓN LÓGICA
    ValidationEngine.validateSubnetConsistency(ip, subnet);

    // Intentar en ethernet primero, si no en wireless
    let port = this.getNetworkPort('ethernet') || this.getNetworkPort('wireless');
    if (port) {
      port.PORT_DHCP_ENABLE = 'false';
      port.IP = ip;
      port.SUBNET = subnet;
      console.log(`   [PC ${this.getName()}] IP: ${ip} / ${subnet} [OK]`);
    }
  }

  public enableDHCP(): void {
    const port = this.getNetworkPort('ethernet') || this.getNetworkPort('wireless');
    if (port) port.PORT_DHCP_ENABLE = 'true';
  }

  public setGateway(gatewayIp: string): void {
    // Intentar validar contra la IP actual si existe
    const port = this.getNetworkPort('ethernet') || this.getNetworkPort('wireless');
    if (port && port.IP && port.SUBNET) {
      ValidationEngine.validateSubnetConsistency(port.IP, port.SUBNET, gatewayIp);
    }

    if (port) port.PORT_GATEWAY = gatewayIp;
    this.engineNode.GATEWAY = gatewayIp;
    console.log(`   [PC ${this.getName()}] Gateway: ${gatewayIp} [OK]`);
  }
}
