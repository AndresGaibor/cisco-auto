/**
 * Config Menu
 * Menú para configuración de dispositivos (IPs, VLANs, servicios)
 */
import inquirer from 'inquirer';
import { SessionManager } from './session-manager.ts';
import chalk from 'chalk';

export class ConfigMenu {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Muestra el menú de configuración
   */
  async show(): Promise<void> {
    let running = true;

    while (running) {
      console.log(chalk.blue.bold('\n⚙️  CONFIGURACIÓN DE DISPOSITIVOS\n'));

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: '¿Qué deseas configurar?',
        choices: [
          { name: '📍 Configurar IPs/Interfaces', value: 'ips' },
          { name: '🏷️  Configurar VLANs', value: 'vlans' },
          { name: '🌐 Configurar Servidor DNS', value: 'dns' },
          { name: '📡 Configurar Servidor DHCP', value: 'dhcp' },
          { name: '🔒 Configurar ACLs', value: 'acls' },
          { name: '🔄 Configurar NAT', value: 'nat' },
          { name: '', value: 'sep', disabled: '───────────────' },
          { name: '⬅️  Volver', value: 'back' }
        ]
      }]);

      switch (action) {
        case 'ips':
          await this.configureIPs();
          break;
        case 'vlans':
          await this.configureVLANs();
          break;
        case 'dns':
          await this.configureDNS();
          break;
        case 'dhcp':
          await this.configureDHCP();
          break;
        case 'acls':
          console.log(chalk.yellow('\n🚧 Configuración de ACLs - En desarrollo\n'));
          break;
        case 'nat':
          console.log(chalk.yellow('\n🚧 Configuración de NAT - En desarrollo\n'));
          break;
        case 'back':
          running = false;
          break;
      }
    }
  }

  /**
   * Configura IPs en interfaces
   */
  private async configureIPs(): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const devices = service.listDevices().devices.filter(d => 
      d.type === 'router' || d.type === 'multilayer-switch' || d.type === 'wireless-router'
    );

    if (devices.length === 0) {
      console.log(chalk.yellow('\n⚠️  No hay dispositivos de red (routers/switches) configurados\n'));
      return;
    }

    const { deviceName } = await inquirer.prompt([{
      type: 'list',
      name: 'deviceName',
      message: 'Selecciona el dispositivo:',
      choices: devices.map(d => ({
        name: `${d.icon} ${d.name}`,
        value: d.name
      }))
    }]);

    const device = devices.find(d => d.name === deviceName);
    if (!device) return;

    // Mostrar interfaces actuales
    console.log(chalk.cyan(`\nInterfaces de ${device.name}:`));
    if (device.interfaces.length === 0) {
      console.log(chalk.gray('  Sin interfaces configuradas'));
    } else {
      for (const iface of device.interfaces) {
        const ip = iface.ip ? `${iface.ip}/${iface.mask || '24'}` : 'sin IP';
        console.log(`  ${iface.name}: ${ip}`);
      }
    }
    console.log();

    // Preguntar qué interfaz configurar
    const interfaceChoices = device.interfaces.map(i => ({
      name: `${i.name} (${i.ip || 'sin IP'})`,
      value: i.name
    }));
    
    interfaceChoices.push(
      { name: '➕ Nueva interfaz', value: 'new' },
      { name: '⬅️  Cancelar', value: 'cancel' }
    );

    const { interfaceName } = await inquirer.prompt([{
      type: 'list',
      name: 'interfaceName',
      message: 'Interfaz a configurar:',
      choices: interfaceChoices
    }]);

    if (interfaceName === 'cancel') return;

    let targetInterface = interfaceName;

    // Si es nueva interfaz, pedir nombre
    if (interfaceName === 'new') {
      const { newInterface } = await inquirer.prompt([{
        type: 'input',
        name: 'newInterface',
        message: 'Nombre de la interfaz (ej: GigabitEthernet0/0):',
        validate: (input: string) => {
          if (!input.trim()) return 'El nombre es requerido';
          return true;
        }
      }]);
      targetInterface = newInterface;
    }

    // Configurar IP
    const { ip, mask, gateway, description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'ip',
        message: `Dirección IP para ${targetInterface}:`,
        validate: (input: string) => {
          if (!input.trim()) return true; // Opcional
          const parts = input.split('.');
          if (parts.length !== 4) return 'Formato: 192.168.1.1';
          if (!parts.every(p => {
            const num = parseInt(p);
            return !isNaN(num) && num >= 0 && num <= 255;
          })) return 'Cada octeto debe ser 0-255';
          return true;
        }
      },
      {
        type: 'input',
        name: 'mask',
        message: 'Máscara de subred:',
        default: '255.255.255.0',
        when: (answers: any) => answers.ip.trim()
      },
      {
        type: 'input',
        name: 'gateway',
        message: 'Gateway por defecto (opcional):',
        when: (answers: any) => answers.ip.trim()
      },
      {
        type: 'input',
        name: 'description',
        message: 'Descripción (opcional):'
      }
    ]);

    try {
      service.configureInterface(device.id, {
        name: targetInterface,
        ip: ip.trim() || undefined,
        mask: mask?.trim() || undefined,
        gateway: gateway?.trim() || undefined,
        description: description.trim() || undefined
      });

      console.log(chalk.green(`\n✅ Interfaz ${targetInterface} configurada en ${device.name}\n`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Configura VLANs en switches
   */
  private async configureVLANs(): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const switches = service.listDevices().devices.filter(d => 
      d.type === 'switch' || d.type === 'multilayer-switch'
    );

    if (switches.length === 0) {
      console.log(chalk.yellow('\n⚠️  No hay switches configurados\n'));
      return;
    }

    const { switchName } = await inquirer.prompt([{
      type: 'list',
      name: 'switchName',
      message: 'Selecciona el switch:',
      choices: switches.map(s => ({
        name: `${s.icon} ${s.name}`,
        value: s.name
      }))
    }]);

    const sw = switches.find(s => s.name === switchName);
    if (!sw) return;

    console.log(chalk.cyan(`\nConfigurando VLANs en ${sw.name}\n`));

    // Mostrar VLANs existentes (simulado por ahora)
    console.log(chalk.gray('VLANs actuales:'));
    console.log(chalk.gray('  VLAN 1: default'));
    console.log();

    const { vlanId, vlanName, ports } = await inquirer.prompt([
      {
        type: 'number',
        name: 'vlanId',
        message: 'ID de VLAN (2-4094):',
        validate: (input: number) => {
          if (isNaN(input) || input < 2 || input > 4094) {
            return 'El ID debe estar entre 2 y 4094';
          }
          if (input === 1) return 'VLAN 1 es la VLAN por defecto, usa otro ID';
          return true;
        }
      },
      {
        type: 'input',
        name: 'vlanName',
        message: 'Nombre de la VLAN:',
        validate: (input: string) => {
          if (!input.trim()) return 'El nombre es requerido';
          return true;
        }
      },
      {
        type: 'checkbox',
        name: 'ports',
        message: 'Puertos a asignar (opcional):',
        choices: sw.availablePorts.map(p => ({ name: p, value: p }))
      }
    ]);

    console.log(chalk.green(`\n✅ VLAN ${vlanId} (${vlanName}) configurada en ${sw.name}`));
    if (ports.length > 0) {
      console.log(chalk.gray(`   Puertos asignados: ${ports.join(', ')}`));
    }
    console.log();
  }

  /**
   * Configura servidor DNS
   */
  private async configureDNS(): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const servers = service.listDevices().devices.filter(d => d.type === 'server');

    if (servers.length === 0) {
      console.log(chalk.yellow('\n⚠️  No hay servidores configurados\n'));
      return;
    }

    const { serverName } = await inquirer.prompt([{
      type: 'list',
      name: 'serverName',
      message: 'Selecciona el servidor DNS:',
      choices: servers.map(s => ({
        name: `${s.icon} ${s.name}`,
        value: s.name
      }))
    }]);

    const server = servers.find(s => s.name === serverName);
    if (!server) return;

    console.log(chalk.blue(`\n🌐 Configuración DNS en ${server.name}\n`));

    const { domainName } = await inquirer.prompt([{
      type: 'input',
      name: 'domainName',
      message: 'Nombre de dominio (ej: empresa.local):',
      validate: (input: string) => {
        if (!input.trim()) return 'El dominio es requerido';
        if (!input.includes('.')) return 'El dominio debe contener al menos un punto';
        return true;
      }
    }]);

    const records: { name: string; type: string; value: string }[] = [];
    let addingRecords = true;

    console.log(chalk.cyan('\nAgregar registros DNS:'));

    while (addingRecords) {
      const { name, type, value } = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Nombre del registro (ej: www, mail, ftp):',
          validate: (input: string) => {
            if (!input.trim()) return 'El nombre es requerido';
            return true;
          }
        },
        {
          type: 'list',
          name: 'type',
          message: 'Tipo de registro:',
          choices: [
            { name: 'A (IPv4)', value: 'A' },
            { name: 'CNAME (Alias)', value: 'CNAME' },
            { name: 'MX (Mail)', value: 'MX' },
            { name: 'NS (Nameserver)', value: 'NS' }
          ]
        },
        {
          type: 'input',
          name: 'value',
          message: (answers: any) => answers.type === 'A' ? 'Dirección IP:' : 'Valor:',
          validate: (input: string) => {
            if (!input.trim()) return 'El valor es requerido';
            return true;
          }
        }
      ]);

      records.push({ name: name.trim(), type, value: value.trim() });

      const { addMore } = await inquirer.prompt([{
        type: 'confirm',
        name: 'addMore',
        message: '¿Agregar otro registro?',
        default: true
      }]);

      addingRecords = addMore;
    }

    console.log(chalk.green(`\n✅ Servidor DNS configurado en ${server.name}`));
    console.log(chalk.gray(`   Dominio: ${domainName}`));
    console.log(chalk.gray(`   Registros: ${records.length}`));
    for (const record of records) {
      console.log(chalk.gray(`     ${record.name} ${record.type} ${record.value}`));
    }
    console.log();
  }

  /**
   * Configura servidor DHCP
   */
  private async configureDHCP(): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const routers = service.listDevices().devices.filter(d => 
      d.type === 'router' || d.type === 'multilayer-switch'
    );

    if (routers.length === 0) {
      console.log(chalk.yellow('\n⚠️  No hay routers configurados\n'));
      return;
    }

    const { routerName } = await inquirer.prompt([{
      type: 'list',
      name: 'routerName',
      message: 'Selecciona el router con DHCP:',
      choices: routers.map(r => ({
        name: `${r.icon} ${r.name}`,
        value: r.name
      }))
    }]);

    const router = routers.find(r => r.name === routerName);
    if (!router) return;

    console.log(chalk.blue(`\n📡 Configuración DHCP en ${router.name}\n`));

    const { poolName, network, mask, gateway, dns } = await inquirer.prompt([
      {
        type: 'input',
        name: 'poolName',
        message: 'Nombre del pool DHCP:',
        default: 'POOL1',
        validate: (input: string) => {
          if (!input.trim()) return 'El nombre es requerido';
          return true;
        }
      },
      {
        type: 'input',
        name: 'network',
        message: 'Red (ej: 192.168.1.0):',
        validate: (input: string) => {
          if (!input.trim()) return 'La red es requerida';
          const parts = input.split('.');
          if (parts.length !== 4) return 'Formato inválido';
          return true;
        }
      },
      {
        type: 'input',
        name: 'mask',
        message: 'Máscara de subred:',
        default: '255.255.255.0'
      },
      {
        type: 'input',
        name: 'gateway',
        message: 'Gateway por defecto (opcional):'
      },
      {
        type: 'input',
        name: 'dns',
        message: 'Servidor DNS (opcional):'
      }
    ]);

    console.log(chalk.green(`\n✅ Pool DHCP '${poolName}' configurado en ${router.name}`));
    console.log(chalk.gray(`   Red: ${network}/${mask}`));
    if (gateway.trim()) console.log(chalk.gray(`   Gateway: ${gateway}`));
    if (dns.trim()) console.log(chalk.gray(`   DNS: ${dns}`));
    console.log();
  }
}
