/**
 * REPL Mode
 * Entry point para el modo interactivo
 */
import { Command } from 'commander';
import { SessionManager } from './interactive/session-manager.ts';
import { MainMenu } from './interactive/main-menu.ts';

export function createInteractiveCommand(): Command {
  return new Command('interactive')
    .alias('i')
    .description('Modo interactivo para editar laboratorios Cisco')
    .argument('[file]', 'Archivo YAML/PKA a cargar opcionalmente')
    .action(async (file?: string) => {
      const sessionManager = new SessionManager();

      // Cargar archivo si se proporcionó
      if (file) {
        try {
          await sessionManager.loadFile(file);
          console.log(`Archivo cargado: ${file}`);
        } catch (error) {
          console.error(`Error al cargar archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          console.log('Iniciando con sesión vacía...\n');
        }
      }

      // Iniciar menú principal
      const mainMenu = new MainMenu(sessionManager);
      await mainMenu.start();
    });
}
