/**
 * Shell Commands
 * Comandos tipo shell para uso directo sin modo interactivo
 * 
 * Ejemplos:
 *   cisco-auto cargar lab.yaml
 *   cisco-auto conectar --de=R1 --puerto=Gi0/0 --a=SW1 --puerto=Gi0/1 --cable=cobre
 *   cisco-auto listar-dispositivos
 */
import { Command } from 'commander';
import { SessionManager } from './interactive/session-manager.ts';
import chalk from 'chalk';

export function createShellCommands(): Command[] {
  const commands: Command[] = [];

  // Comando: cargar
  commands.push(
    new Command('cargar')
      .description('Carga un archivo YAML/PKA')
      .argument('<file>', 'Ruta del archivo')
      .action(async (file: string) => {
        const session = new SessionManager();
        try {
          await session.loadFile(file);
          const lab = session.getSessionService().getLab();
          console.log(chalk.green(`✅ Archivo cargado: ${file}`));
          console.log(chalk.gray(`   Lab: ${lab?.getMetadata().name}`));
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: guardar
  commands.push(
    new Command('guardar')
      .description('Guarda el archivo actual')
      .argument('[file]', 'Ruta de guardado (opcional)')
      .action(async (file?: string) => {
        const session = new SessionManager();
        // Cargar sesión previa si existe
        try {
          await session.saveFile(file);
          console.log(chalk.green('✅ Archivo guardado exitosamente'));
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: listar-dispositivos
  commands.push(
    new Command('listar-dispositivos')
      .alias('ls')
      .description('Lista todos los dispositivos del laboratorio')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .action(async (options: { lab: string }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          const result = session.getSessionService().listDevices();

          console.log(chalk.blue.bold(`\n📱 Dispositivos (${result.total}):\n`));
          
          for (const device of result.devices) {
            console.log(`${device.icon} ${chalk.bold(device.name)} (${device.typeDescription})`);
            if (device.model) console.log(chalk.gray(`   Modelo: ${device.model}`));
            if (device.hostname) console.log(chalk.gray(`   Hostname: ${device.hostname}`));
            console.log(chalk.gray(`   Interfaces: ${device.interfaces.length}`));
            if (device.interfaces.length > 0) {
              for (const iface of device.interfaces) {
                const ip = iface.ip ? `${iface.ip}/${iface.mask || '24'}` : 'sin IP';
                console.log(chalk.gray(`     ${iface.name}: ${ip}`));
              }
            }
            console.log();
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: agregar-dispositivo
  commands.push(
    new Command('agregar-dispositivo')
      .description('Agrega un nuevo dispositivo al laboratorio')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .requiredOption('-n, --nombre <name>', 'Nombre del dispositivo')
      .requiredOption('-t, --tipo <type>', 'Tipo (router, switch, pc, server)')
      .option('-m, --modelo <model>', 'Modelo del dispositivo')
      .option('-h, --hostname <hostname>', 'Hostname')
      .action(async (options: { lab: string; nombre: string; tipo: string; modelo?: string; hostname?: string }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          
          const device = session.getSessionService().addDevice({
            name: options.nombre,
            type: options.tipo as any,
            model: options.modelo,
            hostname: options.hostname
          });

          await session.saveFile();
          console.log(chalk.green(`✅ Dispositivo '${device.name}' agregado y guardado`));
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: eliminar-dispositivo
  commands.push(
    new Command('eliminar-dispositivo')
      .description('Elimina un dispositivo del laboratorio')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .requiredOption('-n, --nombre <name>', 'Nombre del dispositivo')
      .action(async (options: { lab: string; nombre: string }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          
          const device = session.getSessionService().getDeviceByName(options.nombre);
          if (!device) {
            console.error(chalk.red(`❌ Dispositivo '${options.nombre}' no encontrado`));
            process.exit(1);
          }

          session.getSessionService().removeDevice(device.id);
          await session.saveFile();
          console.log(chalk.green(`✅ Dispositivo '${options.nombre}' eliminado`));
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: conectar
  commands.push(
    new Command('conectar')
      .description('Conecta dos dispositivos')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .requiredOption('--de <device>', 'Dispositivo origen')
      .requiredOption('--puerto <port>', 'Puerto origen')
      .requiredOption('-a, --a <device>', 'Dispositivo destino')
      .requiredOption('--puerto-dst <port>', 'Puerto destino')
      .requiredOption('-c, --cable <type>', 'Tipo de cable (cobre, fibra, serial)')
      .action(async (options: { 
        lab: string; 
        de: string; 
        puerto: string; 
        a: string; 
        puertoDst: string; 
        cable: string;
      }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          
          const connection = session.getSessionService().addConnection({
            fromDeviceName: options.de,
            fromPort: options.puerto,
            toDeviceName: options.a,
            toPort: options.puertoDst,
            cableType: options.cable
          });

          await session.saveFile();
          console.log(chalk.green(`✅ Conexión creada:`));
          console.log(chalk.gray(`   ${connection.displayString}`));
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: desconectar
  commands.push(
    new Command('desconectar')
      .description('Elimina una conexión entre dispositivos')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .requiredOption('--de <device>', 'Dispositivo origen')
      .requiredOption('--puerto <port>', 'Puerto origen')
      .action(async (options: { lab: string; de: string; puerto: string }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          
          const device = session.getSessionService().getDeviceByName(options.de);
          if (!device) {
            console.error(chalk.red(`❌ Dispositivo '${options.de}' no encontrado`));
            process.exit(1);
          }

          const lab = session.getSessionService().getLab();
          const connection = lab?.findConnection(device.id, options.puerto);
          
          if (!connection) {
            console.error(chalk.red(`❌ No hay conexión en ${options.de}(${options.puerto})`));
            process.exit(1);
          }

          session.getSessionService().removeConnection(connection.getId());
          await session.saveFile();
          console.log(chalk.green(`✅ Conexión eliminada: ${connection.toDisplayString()}`));
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: configurar-ip
  commands.push(
    new Command('configurar-ip')
      .description('Configura IP en una interfaz')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .requiredOption('-d, --dispositivo <device>', 'Nombre del dispositivo')
      .requiredOption('-i, --interfaz <interface>', 'Nombre de la interfaz')
      .requiredOption('--ip <ip>', 'Dirección IP')
      .requiredOption('-m, --mascara <mask>', 'Máscara de subred')
      .option('-g, --gateway <gateway>', 'Gateway por defecto')
      .action(async (options: { 
        lab: string; 
        dispositivo: string; 
        interfaz: string; 
        ip: string; 
        mascara: string;
        gateway?: string;
      }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          
          const device = session.getSessionService().getDeviceByName(options.dispositivo);
          if (!device) {
            console.error(chalk.red(`❌ Dispositivo '${options.dispositivo}' no encontrado`));
            process.exit(1);
          }

          session.getSessionService().configureInterface(device.id, {
            name: options.interfaz,
            ip: options.ip,
            mask: options.mascara,
            gateway: options.gateway
          });

          await session.saveFile();
          console.log(chalk.green(`✅ IP configurada en ${options.dispositivo}(${options.interfaz}): ${options.ip}/${options.mascara}`));
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: listar-conexiones
  commands.push(
    new Command('listar-conexiones')
      .description('Lista todas las conexiones')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .action(async (options: { lab: string }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          const result = session.getSessionService().listConnections();

          console.log(chalk.blue.bold(`\n🔌 Conexiones (${result.total}):\n`));
          
          if (result.connections.length === 0) {
            console.log(chalk.gray('No hay conexiones configuradas'));
          } else {
            for (const conn of result.connections) {
              const status = conn.functional ? chalk.green('✓') : chalk.red('✗');
              console.log(`${status} ${conn.displayString}`);
            }
          }
          console.log();
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: validar
  commands.push(
    new Command('validar')
      .description('Valida el laboratorio')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .action(async (options: { lab: string }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          const result = session.getSessionService().validate();

          console.log(chalk.blue.bold('\n📋 Validación del Laboratorio\n'));

          if (result.valid && result.warnings.length === 0) {
            console.log(chalk.green('✅ El laboratorio es válido\n'));
            return;
          }

          if (result.errors.length > 0) {
            console.log(chalk.red.bold('❌ Errores:'));
            for (const error of result.errors) {
              const entity = error.entity ? chalk.gray(`[${error.entity}]`) : '';
              console.log(chalk.red(`  • ${entity} ${error.message}`));
            }
            console.log();
          }

          if (result.warnings.length > 0) {
            console.log(chalk.yellow.bold('⚠️  Advertencias:'));
            for (const warning of result.warnings) {
              const entity = warning.entity ? chalk.gray(`[${warning.entity}]`) : '';
              console.log(chalk.yellow(`  • ${entity} ${warning.message}`));
            }
            console.log();
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  // Comando: estadisticas
  commands.push(
    new Command('estadisticas')
      .alias('stats')
      .description('Muestra estadísticas del laboratorio')
      .requiredOption('-l, --lab <file>', 'Archivo del laboratorio')
      .action(async (options: { lab: string }) => {
        const session = new SessionManager();
        try {
          await session.loadFile(options.lab);
          const stats = session.getSessionService().getStats();
          const lab = session.getSessionService().getLab();

          console.log(chalk.blue.bold(`\n📊 Estadísticas: ${lab?.getMetadata().name}\n`));
          console.log(chalk.gray(`Dispositivos: ${stats.deviceCount}`));
          console.log(chalk.gray(`Conexiones: ${stats.connectionCount}`));
          console.log();
          
          if (Object.keys(stats.devicesByType).length > 0) {
            console.log(chalk.cyan('Por tipo:'));
            for (const [type, count] of Object.entries(stats.devicesByType)) {
              console.log(chalk.gray(`  ${type}: ${count}`));
            }
          }
          console.log();

          if (stats.validationStatus.errorCount > 0) {
            console.log(chalk.red(`Errores de validación: ${stats.validationStatus.errorCount}`));
          }
          if (stats.validationStatus.warningCount > 0) {
            console.log(chalk.yellow(`Advertencias: ${stats.validationStatus.warningCount}`));
          }
          console.log();
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          process.exit(1);
        }
      })
  );

  return commands;
}