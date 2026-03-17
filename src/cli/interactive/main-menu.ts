/**
 * Main Menu
 * Menú principal del modo interactivo
 */
import inquirer from 'inquirer';
import { SessionManager } from './session-manager.ts';
import { DeviceMenu } from './device-menu.ts';
import { ConnectionMenu } from './connection-menu.ts';
import { ConfigMenu } from './config-menu.ts';
import chalk from 'chalk';

export class MainMenu {
  private sessionManager: SessionManager;
  private deviceMenu: DeviceMenu;
  private connectionMenu: ConnectionMenu;
  private configMenu: ConfigMenu;
  private running: boolean = false;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.deviceMenu = new DeviceMenu(sessionManager);
    this.connectionMenu = new ConnectionMenu(sessionManager);
    this.configMenu = new ConfigMenu(sessionManager);
  }

  /**
   * Inicia el menú principal
   */
  async start(): Promise<void> {
    this.running = true;

    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║         🖥️  CISCO-AUTO - MODO INTERACTIVO                  ║'));
    console.log(chalk.cyan.bold('║         Laboratorios Cisco Packet Tracer                   ║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

    while (this.running) {
      try {
        await this.showMainMenu();
      } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
      }
    }
  }

  /**
   * Muestra el menú principal
   */
  private async showMainMenu(): Promise<void> {
    const session = this.sessionManager.getSession();
    const hasLab = session.sessionService.hasLab();
    const lab = hasLab ? session.sessionService.getLab() : null;

    // Mostrar estado actual
    if (hasLab && lab) {
      const metadata = lab.getMetadata();
      const modified = lab.isModified() ? chalk.yellow(' [MODIFICADO]') : chalk.green(' [GUARDADO]');
      console.log(chalk.blue(`\n📁 Lab: ${chalk.bold(metadata.name)}${modified}`));
      console.log(chalk.gray(`   Autor: ${metadata.author || 'N/A'} | Dificultad: ${metadata.difficulty} | v${metadata.version}`));
      
      const stats = session.sessionService.getStats();
      console.log(chalk.gray(`   Dispositivos: ${stats.deviceCount} | Conexiones: ${stats.connectionCount}`));
      
      if (stats.validationStatus.errorCount > 0) {
        console.log(chalk.red(`   ⚠️  Errores: ${stats.validationStatus.errorCount}`));
      }
      if (stats.validationStatus.warningCount > 0) {
        console.log(chalk.yellow(`   ⚡ Advertencias: ${stats.validationStatus.warningCount}`));
      }
    } else {
      console.log(chalk.gray('\n📂 No hay laboratorio cargado'));
    }

    console.log();

    // Opciones del menú
    const choices: { name: string; value: string; disabled?: boolean | string }[] = [];

    if (!hasLab) {
      choices.push(
        { name: '📂 Cargar archivo YAML', value: 'load' },
        { name: '➕ Crear nuevo laboratorio', value: 'create' }
      );
    } else {
      choices.push(
        { name: '📱 Gestionar dispositivos', value: 'devices' },
        { name: '🔌 Configurar conexiones', value: 'connections' },
        { name: '⚙️  Configurar dispositivos', value: 'config' },
        { name: '🌐 Configurar routing', value: 'routing' },
        { name: '🔒 Configurar seguridad', value: 'security' },
        { name: '✅ Validar laboratorio', value: 'validate' },
        { name: '💡 Ver sugerencias', value: 'suggestions' },
        { name: '💾 Guardar cambios', value: 'save' },
        { name: '💾 Guardar como...', value: 'save-as' },
        { name: '📂 Cargar otro archivo', value: 'load' },
        { name: '🆕 Creer nuevo laboratorio', value: 'create' }
      );
    }

    choices.push(
      { name: '❌ Salir', value: 'exit' }
    );

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '¿Qué deseas hacer?',
      choices,
      pageSize: 15
    }]);

    await this.handleAction(action);
  }

  /**
   * Maneja la acción seleccionada
   */
  private async handleAction(action: string): Promise<void> {
    switch (action) {
      case 'load':
        await this.loadFile();
        break;
      case 'create':
        await this.createNewLab();
        break;
      case 'devices':
        await this.deviceMenu.show();
        break;
      case 'connections':
        await this.connectionMenu.show();
        break;
      case 'config':
        await this.configMenu.show();
        break;
      case 'routing':
        console.log(chalk.yellow('\n🚧 Configuración de routing - En desarrollo\n'));
        break;
      case 'security':
        console.log(chalk.yellow('\n🚧 Configuración de seguridad - En desarrollo\n'));
        break;
      case 'validate':
        await this.validateLab();
        break;
      case 'suggestions':
        await this.showSuggestions();
        break;
      case 'save':
        await this.saveFile();
        break;
      case 'save-as':
        await this.saveFileAs();
        break;
      case 'exit':
        await this.exit();
        break;
    }
  }

  /**
   * Carga un archivo
   */
  private async loadFile(): Promise<void> {
    const { filePath } = await inquirer.prompt([{
      type: 'input',
      name: 'filePath',
      message: 'Ruta del archivo YAML:',
      validate: (input: string) => {
        if (!input.trim()) return 'La ruta es requerida';
        if (!input.endsWith('.yaml') && !input.endsWith('.yml')) {
          return 'El archivo debe tener extensión .yaml o .yml';
        }
        return true;
      }
    }]);

    try {
      await this.sessionManager.loadFile(filePath);
      console.log(chalk.green(`\n✅ Archivo cargado exitosamente: ${filePath}\n`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error al cargar: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Crea un nuevo laboratorio
   */
  private async createNewLab(): Promise<void> {
    const { name, difficulty } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Nombre del laboratorio:',
        validate: (input: string) => {
          if (!input.trim()) return 'El nombre es requerido';
          if (input.length < 3) return 'El nombre debe tener al menos 3 caracteres';
          return true;
        }
      },
      {
        type: 'list',
        name: 'difficulty',
        message: 'Nivel de dificultad:',
        choices: [
          { name: '🟢 Principiante', value: 'beginner' },
          { name: '🟡 Intermedio', value: 'intermediate' },
          { name: '🔴 Avanzado', value: 'advanced' }
        ]
      }
    ]);

    this.sessionManager.createLab(name, difficulty);
    console.log(chalk.green(`\n✅ Laboratorio '${name}' creado exitosamente\n`));
  }

  /**
   * Valida el laboratorio
   */
  private async validateLab(): Promise<void> {
    try {
      const result = this.sessionManager.getSessionService().validate();

      console.log(chalk.blue.bold('\n📋 Resultado de Validación\n'));

      if (result.valid && result.warnings.length === 0) {
        console.log(chalk.green('✅ El laboratorio es válido\n'));
        return;
      }

      if (result.errors.length > 0) {
        console.log(chalk.red.bold('❌ Errores encontrados:'));
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
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Muestra sugerencias
   */
  private async showSuggestions(): Promise<void> {
    try {
      const suggestions = this.sessionManager.getSessionService().getSuggestions();

      console.log(chalk.blue.bold('\n💡 Sugerencias\n'));

      if (suggestions.length === 0) {
        console.log(chalk.green('No hay sugerencias. ¡Tu laboratorio se ve bien!\n'));
        return;
      }

      for (const suggestion of suggestions) {
        console.log(chalk.cyan(`  ➤ ${suggestion}`));
      }
      console.log();
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Guarda el archivo
   */
  private async saveFile(): Promise<void> {
    try {
      await this.sessionManager.saveFile();
      console.log(chalk.green('\n✅ Archivo guardado exitosamente\n'));
    } catch (error) {
      if ((error as Error).message.includes('ruta de guardado')) {
        // Si no hay ruta, pedir una
        await this.saveFileAs();
      } else {
        console.error(chalk.red(`\n❌ Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
      }
    }
  }

  /**
   * Guarda el archivo con nueva ruta
   */
  private async saveFileAs(): Promise<void> {
    const { filePath } = await inquirer.prompt([{
      type: 'input',
      name: 'filePath',
      message: 'Ruta para guardar:',
      validate: (input: string) => {
        if (!input.trim()) return 'La ruta es requerida';
        if (!input.endsWith('.yaml') && !input.endsWith('.yml')) {
          return 'El archivo debe tener extensión .yaml o .yml';
        }
        return true;
      }
    }]);

    try {
      await this.sessionManager.saveFile(filePath);
      console.log(chalk.green(`\n✅ Archivo guardado exitosamente: ${filePath}\n`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}\n`));
    }
  }

  /**
   * Sale del modo interactivo
   */
  private async exit(): Promise<void> {
    if (this.sessionManager.hasUnsavedChanges()) {
      const { save } = await inquirer.prompt([{
        type: 'confirm',
        name: 'save',
        message: chalk.yellow('Hay cambios sin guardar. ¿Deseas guardar antes de salir?'),
        default: true
      }]);

      if (save) {
        try {
          await this.sessionManager.saveFile();
        } catch (error) {
          console.error(chalk.red(`\n❌ No se pudo guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`));
          const { exitAnyway } = await inquirer.prompt([{
            type: 'confirm',
            name: 'exitAnyway',
            message: '¿Salir sin guardar?',
            default: false
          }]);
          if (!exitAnyway) return;
        }
      }
    }

    console.log(chalk.cyan('\n👋 ¡Hasta luego!\n'));
    this.running = false;
  }
}
