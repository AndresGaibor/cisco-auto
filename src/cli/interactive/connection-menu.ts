/**
 * Connection Menu
 * Menú para gestión de conexiones entre dispositivos
 */
import inquirer from 'inquirer';
import { SessionManager } from './session-manager.ts';
import { CableType } from '../../core/domain/value-objects/cable-type.vo.ts';
import chalk from 'chalk';

const CABLE_OPTIONS = [
  { name: '🔌 Cobre Directo (Straight-through)', value: 'cobre directo', description: 'Para dispositivos diferentes (PC-Switch, Router-Switch)' },
  { name: '⚡ Cobre Cruzado (Cross-over)', value: 'cobre cruzado', description: 'Para dispositivos iguales (Switch-Switch, Router-Router)' },
  { name: '🔷 Fibra Óptica', value: 'fibra', description: 'Para conexiones de larga distancia' },
  { name: '📟 Serial DCE', value: 'serial dce', description: 'Para WAN, provee clocking' },
  { name: '📟 Serial DTE', value: 'serial dte', description: 'Para WAN, recibe clocking' },
  { name: '🔧 Cable Consola', value: 'consola', description: 'Para acceso de configuración' }
];

export class ConnectionMenu {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Muestra el menú de conexiones
   */
  async show(): Promise<void> {
    let running = true;

    while (running) {
      console.log(chalk.blue.bold('\n🔌 GESTIÓN DE CONEXIONES\n'));

      const service = this.sessionManager.getSessionService();
      const connections = service.listConnections();
      const devices = service.listDevices();

      // Mostrar conexiones existentes
      if (connections.connections.length > 0) {
        console.log(chalk.cyan('Conexiones existentes:'));
        for (const conn of connections.connections) {
          const status = conn.functional ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${status} ${conn.displayString}`);
        }
        console.log();
      }

      const choices: { name: string; value: string; disabled?: boolean | string }[] = [
        { name: '➕ Crear nueva conexión', value: 'add' }
      ];

      if (connections.connections.length > 0) {
        choices.push({ name: '🗑️  Eliminar conexión', value: 'delete' });
      }

      choices.push(
        { name: '', value: 'sep', disabled: '───────────────' },
        { name: '⬅️  Volver al menú principal', value: 'back' }
      );

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: `Conexiones (${connections.total}):`,
        choices
      }]);

      switch (action) {
        case 'add':
          await this.addConnection();
          break;
        case 'delete':
          await this.deleteConnection();
          break;
        case 'back':
          running = false;
          break;
      }
    }
  }

  /**
   * Crea una nueva conexión
   */
  private async addConnection(): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const devices = service.listDevices();

    if (devices.devices.length < 2) {
      console.log(chalk.yellow('\n⚠️  Se necesitan al menos 2 dispositivos para crear una conexión\n'));
      return;
    }

    console.log(chalk.blue('\n➕ Nueva Conexión\n'));

    // Seleccionar dispositivo origen
    const fromChoices = devices.devices.map(d => ({
      name: `${d.icon} ${d.name} (${d.typeDescription})`,
      value: d.name
    }));

    const { fromDevice } = await inquirer.prompt([{
      type: 'list',
      name: 'fromDevice',
      message: 'Dispositivo origen:',
      choices: fromChoices,
      pageSize: 15
    }]);

    // Obtener puertos disponibles del dispositivo origen
    const fromDeviceData = devices.devices.find(d => d.name === fromDevice);
    if (!fromDeviceData) return;

    // Obtener información de puertos del dispositivo origen
    const fromPortsResult = service.getAvailablePorts(fromDeviceData.id);
    const availableFromPorts = fromPortsResult.filter(p => p.available);
    
    if (availableFromPorts.length === 0) {
      console.log(chalk.red(`\n❌ El dispositivo '${fromDevice}' no tiene puertos disponibles\n`));
      return;
    }

    const fromPortChoices = availableFromPorts.map(p => ({
      name: `${p.portName} ${p.supportsFiber ? '🔷' : ''} ${p.supportsCopper ? '🔌' : ''} ${p.supportsSerial ? '📟' : ''}`,
      value: p.portName
    }));

    const { fromPort } = await inquirer.prompt([{
      type: 'list',
      name: 'fromPort',
      message: `Puerto en ${fromDevice}:`,
      choices: fromPortChoices
    }]);

    // Seleccionar dispositivo destino
    const toChoices = devices.devices
      .filter(d => d.name !== fromDevice)
      .map(d => ({
        name: `${d.icon} ${d.name} (${d.typeDescription})`,
        value: d.name
      }));

    const { toDevice } = await inquirer.prompt([{
      type: 'list',
      name: 'toDevice',
      message: 'Dispositivo destino:',
      choices: toChoices,
      pageSize: 15
    }]);

    // Obtener puertos disponibles del dispositivo destino
    const toDeviceData = devices.devices.find(d => d.name === toDevice);
    if (!toDeviceData) return;

    const toPortsResult = service.getAvailablePorts(toDeviceData.id);
    const availableToPorts = toPortsResult.filter(p => p.available);

    if (availableToPorts.length === 0) {
      console.log(chalk.red(`\n❌ El dispositivo '${toDevice}' no tiene puertos disponibles\n`));
      return;
    }

    const toPortChoices = availableToPorts.map(p => ({
      name: `${p.portName} ${p.supportsFiber ? '🔷' : ''} ${p.supportsCopper ? '🔌' : ''} ${p.supportsSerial ? '📟' : ''}`,
      value: p.portName
    }));

    const { toPort } = await inquirer.prompt([{
      type: 'list',
      name: 'toPort',
      message: `Puerto en ${toDevice}:`,
      choices: toPortChoices
    }]);

    // Mostrar sugerencias de cable
    const fromPortInfo = fromPortsResult.find(p => p.portName === fromPort);
    const toPortInfo = toPortsResult.find(p => p.portName === toPort);

    console.log(chalk.gray(`\nPuerto origen: ${fromPort} (${fromPortInfo?.supportsCopper ? 'Cobre' : ''}${fromPortInfo?.supportsFiber ? '/Fibra' : ''}${fromPortInfo?.supportsSerial ? '/Serial' : ''})`));
    console.log(chalk.gray(`Puerto destino: ${toPort} (${toPortInfo?.supportsCopper ? 'Cobre' : ''}${toPortInfo?.supportsFiber ? '/Fibra' : ''}${toPortInfo?.supportsSerial ? '/Serial' : ''})`));

    // Sugerir tipo de cable basado en los dispositivos
    this.showCableSuggestion(fromDeviceData.type, toDeviceData.type);

    // Seleccionar tipo de cable
    const { cableType } = await inquirer.prompt([{
      type: 'list',
      name: 'cableType',
      message: 'Tipo de cable:',
      choices: CABLE_OPTIONS.map(c => ({
        name: `${c.name}\n   ${chalk.gray(c.description)}`,
        value: c.value,
        short: c.name.split('(')[0].trim()
      }))
    }]);

    // Crear la conexión
    try {
      const connection = service.addConnection({
        fromDeviceName: fromDevice,
        fromPort,
        toDeviceName: toDevice,
        toPort,
        cableType
      });

      console.log(chalk.green(`\n✅ Conexión creada exitosamente`));
      console.log(chalk.gray(`   ${connection.displayString}\n`));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(chalk.red(`\n❌ Error al crear conexión: ${errorMsg}\n`));
      
      // Mostrar sugerencia alternativa
      if (errorMsg.includes('Fibra') || errorMsg.includes('Cobre')) {
        console.log(chalk.yellow('💡 Tip: Verifica que el tipo de cable sea compatible con los puertos seleccionados\n'));
      }
    }
  }

  /**
   * Elimina una conexión
   */
  private async deleteConnection(): Promise<void> {
    const service = this.sessionManager.getSessionService();
    const connections = service.listConnections();

    if (connections.connections.length === 0) {
      console.log(chalk.yellow('\n⚠️  No hay conexiones para eliminar\n'));
      return;
    }

    const choices = connections.connections.map(c => ({
      name: c.displayString,
      value: c.id
    }));

    choices.push({ name: '⬅️  Cancelar', value: 'cancel' });

    const { connectionId } = await inquirer.prompt([{
      type: 'list',
      name: 'connectionId',
      message: 'Selecciona la conexión a eliminar:',
      choices
    }]);

    if (connectionId === 'cancel') return;

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: '¿Eliminar esta conexión?',
      default: false
    }]);

    if (confirm) {
      try {
        service.removeConnection(connectionId);
        console.log(chalk.green('\n✅ Conexión eliminada\n'));
      } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
      }
    }
  }

  /**
   * Muestra sugerencia de cable basada en tipos de dispositivos
   */
  private showCableSuggestion(fromType: string, toType: string): void {
    let suggestion = '';

    // Router-Switch: Cobre directo
    if ((fromType === 'router' && toType === 'switch') ||
        (fromType === 'switch' && toType === 'router')) {
      suggestion = 'Para Router-Switch se recomienda: Cobre Directo';
    }
    // PC-Switch: Cobre directo
    else if ((fromType === 'pc' && toType === 'switch') ||
             (fromType === 'switch' && toType === 'pc')) {
      suggestion = 'Para PC-Switch se recomienda: Cobre Directo';
    }
    // Server-Switch: Cobre directo
    else if ((fromType === 'server' && toType === 'switch') ||
             (fromType === 'switch' && toType === 'server')) {
      suggestion = 'Para Servidor-Switch se recomienda: Cobre Directo';
    }
    // Switch-Switch: Cobre cruzado
    else if (fromType === 'switch' && toType === 'switch') {
      suggestion = 'Para Switch-Switch se recomienda: Cobre Cruzado';
    }
    // Router-Router: Serial o Cobre cruzado
    else if (fromType === 'router' && toType === 'router') {
      suggestion = 'Para Router-Router: usa Serial (WAN) o Cobre Cruzado (LAN)';
    }
    // Router-PC: Cobre cruzado
    else if ((fromType === 'router' && toType === 'pc') ||
             (fromType === 'pc' && toType === 'router')) {
      suggestion = 'Para Router-PC se recomienda: Cobre Cruzado';
    }

    if (suggestion) {
      console.log(chalk.cyan(`💡 Sugerencia: ${suggestion}\n`));
    }
  }
}
