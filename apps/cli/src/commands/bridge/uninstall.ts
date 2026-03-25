import { Command } from 'commander';

export function createUninstallCommand(): Command {
  return new Command('uninstall')
    .description('Desinstala el bridge como servicio del sistema (Wave 2)')
    .action(() => {
      console.log('🚧 Desinstalando bridge... (disponible en Wave 2)');
      console.log('');
      console.log('Esta funcionalidad eliminará:');
      console.log('   • Servicio de macOS (launchd)');
      console.log('   • Entrada de registro de Windows');
      console.log('   • Archivos de configuración del servicio');
      console.log('');
      console.log('Próximamente en Wave 2...');
    });
}
