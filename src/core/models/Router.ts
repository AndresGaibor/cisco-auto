import { BaseDevice } from './BaseDevice.ts';

export class Router extends BaseDevice {
  
  /**
   * Asigna IP a una interfaz física
   */
  public setInterfaceIp(interfaceName: string, ip: string, mask: string): void {
    this.insertIntoConfigBlock(`interface ${interfaceName}`, [
      `ip address ${ip} ${mask}`,
      `no shutdown`
    ]);
  }

  /**
   * Configura una subinterfaz para Router-on-a-stick (InterVLAN routing)
   */
  public configureSubInterface(physicalInterface: string, subId: number, vlanId: number, ip: string, mask: string): void {
    const subIfaceName = `${physicalInterface}.${subId}`;
    this.insertIntoConfigBlock(`interface ${subIfaceName}`, [
      `encapsulation dot1Q ${vlanId}`,
      `ip address ${ip} ${mask}`
    ]);
    
    // Asegurar que la interfaz física está encendida
    this.insertIntoConfigBlock(`interface ${physicalInterface}`, [`no shutdown`]);
  }

  /**
   * Configura un servidor DHCP en el router
   */
  public setupDHCP(poolName: string, network: string, mask: string, defaultRouter: string, dnsServer?: string): void {
    const commands = [
      `network ${network} ${mask}`,
      `default-router ${defaultRouter}`
    ];
    if (dnsServer) commands.push(`dns-server ${dnsServer}`);
    
    this.insertIntoConfigBlock(`ip dhcp pool ${poolName}`, commands);
  }

  /**
   * Excluye IPs del DHCP
   */
  public excludeDHCPIp(startIp: string, endIp?: string): void {
    const cmd = endIp ? `ip dhcp excluded-address ${startIp} ${endIp}` : `ip dhcp excluded-address ${startIp}`;
    this.appendRunningConfig(cmd);
  }

  /**
   * Configura una ruta estática
   */
  public addStaticRoute(network: string, mask: string, nextHop: string): void {
    this.appendRunningConfig(`ip route ${network} ${mask} ${nextHop}`);
  }

  /**
   * Configura OSPF
   */
  public configureOSPF(processId: number, networks: {ip: string, wildcard: string, area: number}[]): void {
    const commands = networks.map(n => `network ${n.ip} ${n.wildcard} area ${n.area}`);
    this.insertIntoConfigBlock(`router ospf ${processId}`, commands);
  }

  /**
   * Configura NAT Estático
   */
  public setupStaticNAT(insideIp: string, outsideIp: string, insideInterface: string, outsideInterface: string): void {
    this.appendRunningConfig(`ip nat inside source static ${insideIp} ${outsideIp}`);
    this.insertIntoConfigBlock(`interface ${insideInterface}`, ['ip nat inside']);
    this.insertIntoConfigBlock(`interface ${outsideInterface}`, ['ip nat outside']);
  }

  /**
   * Añade una Access Control List Estándar
   */
  public addStandardACL(number: number, action: 'permit' | 'deny', source: string, wildcard: string): void {
    this.appendRunningConfig(`access-list ${number} ${action} ${source} ${wildcard}`);
  }

  /**
   * Añade una Access Control List Extendida
   */
  public addExtendedACL(number: number, action: 'permit' | 'deny', protocol: string, source: string, sourceWildcard: string, dest: string, destWildcard: string, eqPort?: string): void {
    let cmd = `access-list ${number} ${action} ${protocol} ${source} ${sourceWildcard} ${dest} ${destWildcard}`;
    if (eqPort) cmd += ` eq ${eqPort}`;
    this.appendRunningConfig(cmd);
  }

  /**
   * Aplica una ACL a una interfaz
   */
  public applyACLToInterface(interfaceName: string, aclNumber: number, direction: 'in' | 'out'): void {
    this.insertIntoConfigBlock(`interface ${interfaceName}`, [
      `ip access-group ${aclNumber} ${direction}`
    ]);
  }

  /**
   * Configura NAT Dinámico con Sobrecarga (PAT)
   */
  public setupNATOverload(aclNumber: number, outsideInterface: string): void {
    this.appendRunningConfig(`ip nat inside source list ${aclNumber} interface ${outsideInterface} overload`);
  }
}
