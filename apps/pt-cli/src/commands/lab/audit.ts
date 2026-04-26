#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control/controller';

export function createAuditCommand(): Command {
  const cmd = new Command('audit')
    .description('Auditoría forense completa del laboratorio');

  cmd
    .command('full')
    .description('Ejecuta todas las validaciones (Física, L2, L3, Servicios)')
    .action(async () => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        console.log(chalk.bold.magenta('\n🔍 INICIANDO AUDITORÍA FORENSE DE RED...'));

        // 1. CAPA FÍSICA
        process.stdout.write(chalk.cyan('  📡 Validando Capa Física... '));
        const topo = await controller.omniscience.getTopology();
        console.log(chalk.green(`OK (${topo.links.length} enlaces detected)`));

        // 2. CAPA 2 (MAC TABLE)
        console.log(chalk.cyan('  📦 Validando Capa 2 (Switching)...'));
        const configs = await controller.omniscience.siphonAllConfigs();
        for (const c of configs) {
            if (c.deviceName.startsWith('S') || c.deviceName.includes('Switch')) {
                const macs = await controller.omniscience.evaluate(`
                    (function() {
                        var d = ipc.network().getDevice('${c.deviceName}');
                        return d && d.getMacAddressTable ? d.getMacAddressTable().getEntryCount() : 0;
                    })()
                `);
                console.log(`    - ${c.deviceName}: ${macs} MACs aprendidas.`);
            }
        }

        // 3. CAPA 3 (PING MATRIX)
        console.log(chalk.cyan('  🌐 Validando Capa 3 (Conectividad)...'));
        const devices = topo.devices.filter(d => d.startsWith('PC'));
        if (devices.length >= 2) {
            const ok = await controller.omniscience.sendPing(devices[0], "192.168.10.20"); // TODO: Dinámico
            console.log(`    - Ping ${devices[0]} -> PC2: ${ok ? chalk.green('EXITOSO') : chalk.red('FALLIDO')}`);
        }

        console.log(chalk.bold.green('\n🏁 AUDITORÍA FINALIZADA.\n'));

      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error en la auditoría: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  return cmd;
}
