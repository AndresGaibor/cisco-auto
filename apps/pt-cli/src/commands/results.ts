import { Command } from 'commander';
import { resolve } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';

function getDefaultDevDir(): string {
  if (process.env.PT_DEV_DIR) {
    return process.env.PT_DEV_DIR;
  }
  const home = homedir();
  if (process.platform === 'win32') {
    return resolve(process.env.USERPROFILE || home, 'pt-dev');
  }
  return resolve(home, 'pt-dev');
}

export function createResultsCommand(): Command {
  const cmd = new Command('results')
    .description('Gestionar resultados de comandos en ~/pt-dev/');

  cmd
    .command('list')
    .description('Listar archivos de resultados')
    .option('-n, --num <number>', 'Número de resultados a mostrar', '20')
    .option('-j, --json', 'Salida en formato JSON')
    .action(async (options) => {
      try {
        const devDir = getDefaultDevDir();
        const resultsDir = resolve(devDir, 'results');
        
        const { readdir, stat } = await import('fs/promises');
        
        let files: string[] = [];
        try {
          files = await readdir(resultsDir);
        } catch {
          console.error('❌ Directorio de resultados no encontrado:', resultsDir);
          process.exit(1);
        }

        const fileInfos = await Promise.all(
          files
            .filter(f => f.startsWith('cmd_') && f.endsWith('.json'))
            .map(async (f) => {
              const filePath = resolve(resultsDir, f);
              const stats = await stat(filePath);
              return { name: f, mtime: stats.mtime, size: stats.size };
            })
        );

        fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        
        const limit = parseInt(options.num) || 20;
        const limited = fileInfos.slice(0, limit);

        if (options.json) {
          console.log(JSON.stringify(limited, null, 2));
        } else {
          console.log(`\n📁 Resultados en ${resultsDir} (${fileInfos.length} total):\n`);
          limited.forEach((f, i) => {
            const date = f.mtime.toISOString().slice(0, 19).replace('T', ' ');
            const size = f.size < 1024 ? `${f.size}B` : `${(f.size / 1024).toFixed(1)}KB`;
            console.log(`${i + 1}. ${chalk.cyan(f.name)} ${chalk.gray(date)} ${chalk.yellow(size)}`);
          });
          console.log('');
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  cmd
    .command('clean')
    .description('Limpiar archivos de resultados antiguos')
    .option('-k, --keep <number>', 'Cantidad de resultados a mantener', '50')
    .option('-d, --days <number>', 'Mantener solo resultados de los últimos N días')
    .option('-f, --force', 'No pedir confirmación')
    .action(async (options) => {
      try {
        const devDir = getDefaultDevDir();
        const resultsDir = resolve(devDir, 'results');
        
        const { readdir, stat, unlink } = await import('fs/promises');
        
        let files: string[] = [];
        try {
          files = await readdir(resultsDir);
        } catch {
          console.error('❌ Directorio de resultados no encontrado:', resultsDir);
          process.exit(1);
        }

        const fileInfos = await Promise.all(
          files
            .filter(f => f.startsWith('cmd_') && f.endsWith('.json'))
            .map(async (f) => {
              const filePath = resolve(resultsDir, f);
              const stats = await stat(filePath);
              return { name: f, path: filePath, mtime: stats.mtime };
            })
        );

        fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        let toDelete: string[] = [];
        
        if (options.days) {
          const cutoff = Date.now() - (parseInt(options.days) * 24 * 60 * 60 * 1000);
          toDelete = fileInfos.filter(f => f.mtime.getTime() < cutoff).map(f => f.path);
        } else {
          const keep = parseInt(options.keep) || 50;
          toDelete = fileInfos.slice(keep).map(f => f.path);
        }

        if (toDelete.length === 0) {
          console.log('✅ No hay archivos para eliminar');
          return;
        }

        if (!options.force) {
          console.log(`\n🗑️  Se eliminarán ${toDelete.length} archivos:`);
          toDelete.slice(0, 5).forEach(p => console.log(`   - ${require('path').basename(p)}`));
          if (toDelete.length > 5) {
            console.log(`   ... y ${toDelete.length - 5} más`);
          }
          console.log('');
          
          const readline = await import('readline');
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const answer = await new Promise<string>((resolve) => {
            rl.question('¿Continuar? (s/n): ', (ans) => {
              rl.close();
              resolve(ans.toLowerCase());
            });
          });
          
          if (answer !== 's' && answer !== 'si' && answer !== 'y') {
            console.log('❌ Operación cancelada');
            return;
          }
        }

        let deleted = 0;
        for (const path of toDelete) {
          try {
            await unlink(path);
            deleted++;
          } catch {}
        }

        console.log(`✅ ${deleted} archivos eliminados`);
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  cmd
    .command('view <file>')
    .description('Ver contenido de un archivo de resultado')
    .option('-j, --json', 'Mostrar como JSON formateado')
    .action(async (file, options) => {
      try {
        const devDir = getDefaultDevDir();
        const filePath = resolve(devDir, 'results', file);
        
        const { readFile } = await import('fs/promises');
        
        try {
          const content = await readFile(filePath, 'utf-8');
          if (options.json) {
            console.log(JSON.stringify(JSON.parse(content), null, 2));
          } else {
            console.log(content);
          }
        } catch {
          console.error('❌ Archivo no encontrado:', file);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return cmd;
}
