import { Transaction, type TransactionCommand } from "./transaction.js";

export interface InterfaceConfig {
  name: string;
  ip?: string;
  mask?: string;
  description?: string;
  shutdown?: boolean;
}

export interface OspfConfig {
  processId: number;
  network: string;
  wildcard: string;
  area: number;
}

export interface EigrpConfig {
  asNumber: number;
  network: string;
  wildcard?: string;
}

export interface AclConfig {
  name: string;
  rules: string[];
}

export interface VlanConfig {
  vlanId: number;
  name?: string;
  interfaces?: string[];
}

export interface DeviceConfig {
  hostname: string;
  enablePassword?: string;
}

export class TransactionBuilder {
  private _commands: TransactionCommand[] = [];
  private _deviceConfig?: DeviceConfig;

  configure(device: DeviceConfig): this {
    this._deviceConfig = device;
    this._commands.push({
      command: `hostname ${device.hostname}`,
      rollbackCommand: "",
      description: `Configurar hostname: ${device.hostname}`,
    });
    if (device.enablePassword) {
      this._commands.push({
        command: `enable secret ${device.enablePassword}`,
        rollbackCommand: "no enable secret",
        description: "Configurar enable secret",
      });
    }
    return this;
  }

  interface(config: InterfaceConfig): this {
    this._commands.push({
      command: `interface ${config.name}`,
      rollbackCommand: `no interface ${config.name}`,
      description: `Entrar interfaz: ${config.name}`,
    });

    if (config.description) {
      this._commands.push({
        command: `description ${config.description}`,
        rollbackCommand: "no description",
        description: `Descripción de interfaz: ${config.description}`,
      });
    }

    if (config.ip && config.mask) {
      this._commands.push({
        command: `ip address ${config.ip} ${config.mask}`,
        rollbackCommand: "no ip address",
        description: `IP: ${config.ip}/${config.mask}`,
      });
    }

    if (config.shutdown === false) {
      this._commands.push({
        command: "no shutdown",
        rollbackCommand: "shutdown",
        description: "Activar interfaz",
      });
    }

    this._commands.push({
      command: "exit",
      rollbackCommand: "",
      description: "Salir de interfaz",
    });
    return this;
  }

  ospf(config: OspfConfig): this {
    this._commands.push({
      command: `router ospf ${config.processId}`,
      rollbackCommand: `no router ospf ${config.processId}`,
      description: `OSPF process: ${config.processId}`,
    });

    const wildcard = config.wildcard || "0.0.0.255";
    this._commands.push({
      command: `network ${config.network} ${wildcard} area ${config.area}`,
      rollbackCommand: `no network ${config.network} ${wildcard} area ${config.area}`,
      description: `OSPF network: ${config.network} area ${config.area}`,
    });

    this._commands.push({
      command: "exit",
      rollbackCommand: "",
      description: "Salir de OSPF",
    });
    return this;
  }

  eigrp(config: EigrpConfig): this {
    this._commands.push({
      command: `router eigrp ${config.asNumber}`,
      rollbackCommand: `no router eigrp ${config.asNumber}`,
      description: `EIGRP AS: ${config.asNumber}`,
    });

    if (config.wildcard) {
      this._commands.push({
        command: `network ${config.network} ${config.wildcard}`,
        rollbackCommand: `no network ${config.network} ${config.wildcard}`,
        description: `EIGRP network: ${config.network}`,
      });
    } else {
      this._commands.push({
        command: `network ${config.network}`,
        rollbackCommand: `no network ${config.network}`,
        description: `EIGRP network: ${config.network}`,
      });
    }

    this._commands.push({
      command: "exit",
      rollbackCommand: "",
      description: "Salir de EIGRP",
    });
    return this;
  }

  acl(config: AclConfig): this {
    for (const rule of config.rules) {
      this._commands.push({
        command: `ip access-list extended ${config.name}\n ${rule}`,
        rollbackCommand: `no ip access-list extended ${config.name}`,
        description: `ACL rule: ${rule}`,
      });
    }
    return this;
  }

  vlan(config: VlanConfig): this {
    this._commands.push({
      command: `vlan ${config.vlanId}`,
      rollbackCommand: `no vlan ${config.vlanId}`,
      description: `VLAN: ${config.vlanId}`,
    });

    if (config.name) {
      this._commands.push({
        command: `name ${config.name}`,
        rollbackCommand: `no name`,
        description: `VLAN name: ${config.name}`,
      });
    }

    this._commands.push({
      command: "exit",
      rollbackCommand: "",
      description: "Salir de VLAN",
    });

    if (config.interfaces && config.interfaces.length > 0) {
      for (const iface of config.interfaces) {
        this._commands.push({
          command: `interface ${iface}\n switchport mode access\n switchport access vlan ${config.vlanId}`,
          rollbackCommand: `interface ${iface}\n no switchport access vlan`,
          description: `Asignar interfaz ${iface} a VLAN ${config.vlanId}`,
        });
        this._commands.push({
          command: "exit",
          rollbackCommand: "",
          description: "Salir de interfaz",
        });
      }
    }

    return this;
  }

  build(): Transaction {
    const tx = new Transaction();
    tx.addBatch(this._commands);
    return tx;
  }
}
