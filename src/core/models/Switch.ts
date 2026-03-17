import { BaseDevice } from './BaseDevice.ts';

export class Switch extends BaseDevice {
  /**
   * Crea una VLAN a nivel nativo en el XML
   */
  public addVlan(id: number, name: string): void {
    if (!this.engineNode.VLANS) {
      this.engineNode.VLANS = { VLAN: [] };
    }
    
    let vlans = this.engineNode.VLANS.VLAN;
    if (!Array.isArray(vlans)) {
      vlans = [vlans];
      this.engineNode.VLANS.VLAN = vlans;
    }

    const exists = vlans.find((v: any) => v['@_number'] == id);
    if (!exists) {
      vlans.push({
        '@_number': id.toString(),
        '@_name': name,
        '@_rspan': '0'
      });
    }

    // Configuración IOS
    this.insertIntoConfigBlock(`vlan ${id}`, [`name ${name}`]);
  }

  /**
   * Configura un puerto como Access y lo asigna a una VLAN
   */
  public setPortAccess(interfaceName: string, vlanId: number): void {
    this.insertIntoConfigBlock(`interface ${interfaceName}`, [
      `switchport mode access`,
      `switchport access vlan ${vlanId}`
    ]);
  }

  /**
   * Configura un puerto como Trunk y permite VLANs específicas
   */
  public setPortTrunk(interfaceName: string, allowedVlans?: string): void {
    const commands = [`switchport mode trunk`];
    if (allowedVlans) {
      commands.push(`switchport trunk allowed vlan ${allowedVlans}`);
    }
    this.insertIntoConfigBlock(`interface ${interfaceName}`, commands);
  }

  /**
   * Configura Port Security en un puerto
   */
  public enablePortSecurity(interfaceName: string, maxMacs: number = 1, violation: 'protect'|'restrict'|'shutdown' = 'shutdown'): void {
    this.insertIntoConfigBlock(`interface ${interfaceName}`, [
      `switchport port-security`,
      `switchport port-security maximum ${maxMacs}`,
      `switchport port-security mac-address sticky`,
      `switchport port-security violation ${violation}`
    ]);
  }

  /**
   * Configura el dominio VTP
   */
  public setVTP(domain: string, mode: 'server' | 'client' | 'transparent' = 'server', password?: string): void {
    // Configuración nativa del simulador
    if (!this.engineNode.VTP) this.engineNode.VTP = {};
    this.engineNode.VTP.DOMAIN_NAME = domain;
    this.engineNode.VTP.MODE = mode === 'server' ? '0' : mode === 'client' ? '1' : '2';
    if (password) this.engineNode.VTP.PASSWORD = password;

    // Configuración IOS
    this.appendRunningConfig(`vtp domain ${domain}`);
    this.appendRunningConfig(`vtp mode ${mode}`);
    if (password) this.appendRunningConfig(`vtp password ${password}`);
  }
}
