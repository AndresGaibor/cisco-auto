/**
 * Device Menu
 * Menú para gestión de dispositivos
 */
import inquirer from 'inquirer';
import { SessionManager } from './session-manager.ts';
import { DeviceType } from '../../core/domain/entities/device.entity.ts';
import chalk from 'chalk';

const DEVICE_ICONS: Record<DeviceType, string> = {
  'router': '🌐',
  'switch': '🔀',
  'multilayer-switch': '🔀',
  'pc': '🖥️',
  'server': '🖥️',
  'access-point': '📡',
  'firewall': '🛡️',
  'cloud': '☁️',
  'modem': '📞',
  'printer': '🖨️',
  'wireless-router': '📶'
};

const DEVICE_DESCRIPTIONS: Record<DeviceType, string> = {
  'router': 'Router - Enrutamiento entre redes',
  'switch': 'Switch - Conmutación Layer 2',
  'multilayer-switch': 'Switch Multicapa - Layer 2 y 3',
  'pc': 'PC - Estación de trabajo',
  'server': 'Servidor - Servicios de red',
  'access-point': 'Access Point - Conectividad WiFi',
  'firewall': 'Firewall - Seguridad de red',
  'cloud': 'Nube - Conexión externa',
  'modem': 'Módem - Conexión WAN',
  'printer': 'Impresora - Dispositivo periférico',
  'wireless-router': 'Router Inalámbrico - SOHO'
};

export class DeviceMenu {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Muestra el menú de dispositivos
   */
  async show(): Promise<void> {
    let running = true;

    while (running) {
      console.log(chalk.blue.bold('\n📱 GESTIÓN DE DISPOSITIVOS\n'));

      // Mostrar lista de dispositivos
      const listResult = this.sessionManager.getSessionService().listDevices();
      
      const choices: { name: string; value: string }[] = [
        { name: '➕ Agregar nuevo dispositivo', value: 'add' }
      ];

      if (listResult.devices.length > 0) {
        choices.push({ name: '', value: 'separator', disabled: '── Dispositivos ──' });
        
        for (const device of listResult.devices) {
          const interfaces = device.interfaces.length > 0 
            ? `${device.interfaces.length} interfaces` 
            : 'sin IPs';
          const name = `${device.icon} ${device.name} (${device.typeDescription}) - ${interfaces}`;
          choices.push({ name, value: `view:${device.id}` });
        }
      }

      choices.push(
        { name: '', value: 'separator2', disabled: '───────────────' },
        { name: '⬅️  Volver al menú principal', value: 'back' }
      );

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: `Dispositivos (${listResult.total}):`,
        choices
      }]);

      if (action === 'back') {
        running = false;
      } else if (action === 'add') {
        await this.addDevice();
      } else if (action.startsWith('view:')) {
        const deviceId = action.replace('view:', '');
        await this.viewDevice(deviceId);
      }
    }
  }

  /**
   * Agrega un nuevo dispositivo
   */
  private async addDevice(): Promise<void> {
    console.log(chalk.blue('\n➕ Agregar Nuevo Dispositivo\n'));

    const deviceTypes: { name: string; value: DeviceType }[] = [
      { name: `${DEVICE_ICONS['router']} Router`, value: 'router' },
      { name: `${DEVICE_ICONS['switch']} Switch`, value: 'switch' },
      { name: `${DEVICE_ICONS['multilayer-switch']} Switch Multicapa`, value: 'multilayer-switch' },
      { name: `${DEVICE_ICONS['pc']} PC`, value: 'pc' },
      { name: `${DEVICE_ICONS['server']} Servidor`, value: 'server' },
      { name: `${DEVICE_ICONS['wireless-router']} Router Inalámbrico`, value: 'wireless-router' },
      { name: `${DEVICE_ICONS['access-point']} Access Point`, value: 'access-point' },
      { name: `${DEVICE_ICONS['firewall']} Firewall`, value: 'firewall' }
    ];

    const { type } = await inquirer.prompt([{
      type: 'list',
      name: 'type',
      message: 'Tipo de dispositivo:',
      choices: deviceTypes
    }]);

    console.log(chalk.gray(`\n${DEVICE_DESCRIPTIONS[type]}\n`));

    const { name } = await inquirer.prompt([{
      type: 'input',
      name: 'name',
      message: 'Nombre del dispositivo:',
      validate: (input: string) => {
        if (!input.trim()) return 'El nombre es requerido';
        if (input.length < 2) return 'Mínimo 2 caracteres';
        // Verificar que no exista
        const existing = this.sessionManager.getSessionService().getDeviceByName(input);
        if (existing) return `Ya existe un dispositivo llamado '${input}'`;
        return true;
      }
    }]);

    const { hostname } = await inquirer.prompt([{
      type: 'input',
      name: 'hostname',
      message: 'Hostname (opcional, dejar vacío para usar el nombre):',
      default: name.toUpperCase()
    }]);

    const { model } = await inquirer.prompt([{
      type: 'input',
      name: 'model',
      message: 'Modelo (opcional):',
      default: this.getDefaultModel(type)
    }]);

    try {
      const device = this.sessionManager.getSessionService().addDevice({
        name: name.trim(),
        type,
        hostname: hostname.trim() || name.toUpperCase(),
        model: model.trim() || undefined
      });

      console.log(chalk.green(`\n✅ Dispositivo '${device.name}' agregado exitosamente\n`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Muestra detalles de un dispositivo
   */
  private async viewDevice(deviceId: string): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const devices = service.listDevices().devices;
    const device = devices.find(d => d.id === deviceId);

    if (!device) {
      console.log(chalk.red('\n❌ Dispositivo no encontrado\n'));
      return;
    }

    console.log(chalk.blue.bold(`\n${device.icon} ${device.name}`));
    console.log(chalk.gray(`Tipo: ${device.typeDescription}`));
    if (device.model) console.log(chalk.gray(`Modelo: ${device.model}`));
    if (device.hostname) console.log(chalk.gray(`Hostname: ${device.hostname}`));
    console.log();

    // Mostrar interfaces
    if (device.interfaces.length > 0) {
      console.log(chalk.cyan('Interfaces:'));
      for (const iface of device.interfaces) {
        const ip = iface.ip ? `${iface.ip}/${service['maskToCidr']?.(iface.mask) || '24'}` : 'sin IP';
        const status = iface.shutdown ? chalk.red(' [DOWN]') : chalk.green(' [UP]');
        console.log(`  ${iface.name}: ${ip}${status}`);
        if (iface.description) {
          console.log(chalk.gray(`    (${iface.description})`));
        }
      }
      console.log();
    }

    // Opciones
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Acciones:',
      choices: [
        { name: '✏️  Editar configuración', value: 'edit' },
        { name: '🔌 Configurar interfaces', value: 'interfaces' },
        { name: '➕ Agregar interfaz', value: 'add-interface' },
        { name: '🗑️  Eliminar dispositivo', value: 'delete' },
        { name: '⬅️  Volver', value: 'back' }
      ]
    }]);

    switch (action) {
      case 'edit':
        await this.editDevice(deviceId);
        break;
      case 'interfaces':
        await this.configureInterfaces(deviceId);
        break;
      case 'add-interface':
        await this.addInterface(deviceId);
        break;
      case 'delete':
        await this.deleteDevice(deviceId);
        break;
    }
  }

  /**
   * Edita un dispositivo
   */
  private async editDevice(deviceId: string): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const devices = service.listDevices().devices;
    const device = devices.find(d => d.id === deviceId);

    if (!device) return;

    console.log(chalk.blue(`\n✏️  Editar ${device.name}\n`));

    const { name, hostname } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Nombre:',
        default: device.name,
        validate: (input: string) => {
          if (!input.trim()) return 'El nombre es requerido';
          const existing = service.getDeviceByName(input);
          if (existing && existing.id !== deviceId) return `Ya existe un dispositivo llamado '${input}'`;
          return true;
        }
      },
      {
        type: 'input',
        name: 'hostname',
        message: 'Hostname:',
        default: device.hostname || device.name.toUpperCase()
      }
    ]);

    try {
      service.updateDevice(deviceId, { name: name.trim(), hostname: hostname.trim() });
      console.log(chalk.green('\n✅ Dispositivo actualizado\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Configura interfaces de un dispositivo
   */
  private async configureInterfaces(deviceId: string): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const devices = service.listDevices().devices;
    const device = devices.find(d => d.id === deviceId);

    if (!device || device.interfaces.length === 0) {
      console.log(chalk.yellow('\n⚠️  No hay interfaces configuradas\n'));
      return;
    }

    console.log(chalk.blue(`\n🔌 Interfaces de ${device.name}\n`));

    const choices = device.interfaces.map(iface => ({
      name: `${iface.name}: ${iface.ip || 'sin IP'} ${iface.shutdown ? chalk.red('[DOWN]') : chalk.green('[UP]')}`,
      value: iface.name
    }));

    choices.push({ name: '⬅️  Volver', value: 'back' as any });

    const { interfaceName } = await inquirer.prompt([{
      type: 'list',
      name: 'interfaceName',
      message: 'Selecciona interfaz para configurar:',
      choices
    }]);

    if (interfaceName === 'back') return;

    await this.configureInterface(deviceId, interfaceName);
  }

  /**
   * Configura una interfaz específica
   */
  private async configureInterface(deviceId: string, interfaceName: string): Promise<void> {
    const service = this.sessionManager.getSessionService();

    console.log(chalk.blue(`\n⚙️  Configurar ${interfaceName}\n`));

    const { ip, mask, gateway, mode, shutdown, description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'ip',
        message: 'Dirección IP:',
        validate: (input: string) => {
          if (!input.trim()) return true; // Opcional
          const parts = input.split('.');
          if (parts.length !== 4) return 'Formato inválido (ej: 192.168.1.1)';
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
        message: 'Gateway (opcional):',
        when: (answers: any) => answers.ip.trim()
      },
      {
        type: 'list',
        name: 'mode',
        message: 'Modo de puerto:',
        choices: [
          { name: 'routed (L3)', value: 'routed' },
          { name: 'access (L2)', value: 'access' },
          { name: 'trunk (L2)', value: 'trunk' }
        ]
      },
      {
        type: 'confirm',
        name: 'shutdown',
        message: '¿Interfaz apagada (shutdown)?',
        default: false
      },
      {
        type: 'input',
        name: 'description',
        message: 'Descripción (opcional):'
      }
    ]);

    try {
      service.configureInterface(deviceId, {
        name: interfaceName,
        ip: ip.trim() || undefined,
        mask: mask?.trim() || undefined,
        gateway: gateway?.trim() || undefined,
        mode,
        shutdown,
        description: description.trim() || undefined
      });

      console.log(chalk.green('\n✅ Interfaz configurada\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Agrega una nueva interfaz
   */
  private async addInterface(deviceId: string): Promise<void> {
    console.log(chalk.blue('\n➕ Agregar Interfaz\n'));

    const { name, ip, mask } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Nombre de la interfaz (ej: GigabitEthernet0/0):',
        validate: (input: string) => {
          if (!input.trim()) return 'El nombre es requerido';
          return true;
        }
      },
      {
        type: 'input',
        name: 'ip',
        message: 'Dirección IP:',
        validate: (input: string) => {
          if (!input.trim()) return true;
          const parts = input.split('.');
          if (parts.length !== 4) return 'Formato inválido';
          return true;
        }
      },
      {
        type: 'input',
        name: 'mask',
        message: 'Máscara de subred:',
        default: '255.255.255.0',
        when: (answers: any) => answers.ip.trim()
      }
    ]);

    try {
      this.sessionManager.getSessionService().configureInterface(deviceId, {
        name: name.trim(),
        ip: ip.trim() || undefined,
        mask: mask?.trim() || undefined
      });
      console.log(chalk.green('\n✅ Interfaz agregada\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Elimina un dispositivo
   */
  private async deleteDevice(deviceId: string): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const devices = service.listDevices().devices;
    const device = devices.find(d => d.id === deviceId);

    if (!device) return;

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: chalk.red(`¿Eliminar el dispositivo '${device.name}'? Esta acción también eliminará sus conexiones.`),
      default: false
    }]);

    if (confirm) {
      try {
        service.removeDevice(deviceId);
        console.log(chalk.green(`\n✅ Dispositivo '${device.name}' eliminado\n`));
      } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
      }
    }
  }

  /**
   * Obtiene el modelo por defecto según el tipo
   */
  private getDefaultModel(type: DeviceType): string {
    const defaults: Record<DeviceType, string> = {
      'router': 'Cisco 2911',
      'switch': 'Cisco 2960',
      'multilayer-switch': 'Cisco 3560',
      'pc': 'PC-PT',
      'server': 'Server-PT',
      'access-point': 'Access Point-PT',
      'firewall': 'ASA 5506-X',
      'cloud': 'Cloud-PT',
      'modem': 'Modem-PT',
      'printer': 'Printer-PT',
      'wireless-router': 'WRT300N'
    };
    return defaults[type];
  }
}