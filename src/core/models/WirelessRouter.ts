import { BaseDevice } from './BaseDevice.ts';

export class WirelessRouter extends BaseDevice {
  
  /**
   * Configura el SSID y la seguridad de la red inalámbrica (2.4GHz)
   */
  public setWirelessBasic(ssid: string, channel: number = 6): void {
    if (!this.engineNode.WIRELESS_SETTINGS) this.engineNode.WIRELESS_SETTINGS = {};
    this.engineNode.WIRELESS_SETTINGS.SSID = ssid;
    this.engineNode.WIRELESS_SETTINGS.CHANNEL = channel.toString();
    console.log(`   [WirelessRouter ${this.getName()}] SSID configurado: ${ssid}`);
  }

  /**
   * Configura seguridad WPA2 Personal
   */
  public setWPA2Security(passphrase: string): void {
    if (!this.engineNode.WIRELESS_SETTINGS) this.engineNode.WIRELESS_SETTINGS = {};
    this.engineNode.WIRELESS_SETTINGS.AUTHENTICATION_TYPE = '4'; // WPA2
    this.engineNode.WIRELESS_SETTINGS.ENCRYPTION_TYPE = '2'; // AES
    this.engineNode.WIRELESS_SETTINGS.PASSPHRASE = passphrase;
  }

  /**
   * Configura la IP del lado LAN (Gateway para los clientes)
   */
  public setLanIp(ip: string, mask: string): void {
    // Los routers Linksys guardan esto en un nodo específico LAN_SETTINGS
    if (!this.engineNode.LAN_SETTINGS) this.engineNode.LAN_SETTINGS = {};
    this.engineNode.LAN_SETTINGS.IP_ADDRESS = ip;
    this.engineNode.LAN_SETTINGS.SUBNET_MASK = mask;
  }
}
