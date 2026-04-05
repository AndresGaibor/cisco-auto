#!/usr/bin/env bun
import { historyStore } from '../telemetry/history-store.js';

import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { loadContextStatus, collectContextStatus } from '../application/context-supervisor.js';
import { getSupervisorStatus } from '../system/context-supervisor.js';
import { getGlobalFlags } from '../flags.js';
import type { ContextStatus } from '../contracts/context-status.js';

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Muestra el estado operativo y salud del contexto CLI (pt status)')
    .option('--json', 'Salida en JSON', false)
    .action(async function (this: Command, opts: { json?: boolean }) {
      const supervisorStatus = getSupervisorStatus();
      
      // Cargar estado persistido o hacer inspección viva
      let status: ContextStatus | null = supervisorStatus.contextStatus ?? await loadContextStatus();

      if (!status) {
        // Short live inspection como último recurso
        const controller = createDefaultPTController();
        try {
          await controller.start();
          const sys = controller.getSystemContext();
          status = {
            schemaVersion: '1.0',
            updatedAt: new Date().toISOString(),
            heartbeat: { state: sys.heartbeat.state },
            bridge: { ready: sys.bridgeReady },
            topology: {
              materialized: sys.topologyMaterialized,
              deviceCount: sys.deviceCount,
              linkCount: sys.linkCount,
              health: 'unknown',
            },
            warnings: sys.warnings ?? [],
          };
        } catch (err) {
          console.error('No se pudo inspeccionar el estado en vivo:', err);
        } finally {
          try { await controller.stop(); } catch (e) { }
        }
      }

      if (!status) {
        console.log('No hay estado de contexto disponible. Ejecuta un comando para inicializar el contexto o usa pt doctor.');
        return;
      }

      const programFlags = getGlobalFlags(this as unknown as Command);
      const jsonOutput = opts.json === true || programFlags.json === true;

      if (jsonOutput) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      // Human readable
      const supervStatus = getSupervisorStatus();
      const running = supervStatus.running ? '✓ Running' : '✗ Not running';
      
      console.log('');
      console.log('Supervisor:', running, supervStatus.pid ? `(PID: ${supervStatus.pid})` : '');
      console.log('Packet Tracer Heartbeat :', status.heartbeat.state);
      console.log('Bridge ready           :', status.bridge.ready ? 'yes' : 'no');
      console.log('Topology materialized  :', status.topology.materialized ? 'yes' : 'no');
      console.log('Topology health        :', status.topology.health);
      console.log('Devices                :', status.topology.deviceCount);
      console.log('Links                  :', status.topology.linkCount);

      if (status.warnings && status.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const w of status.warnings) {
          console.log(' -', w);
        }
        // Phase 7: show recent verification-related warnings from history
        try {
          (async () => {
            const recent = await historyStore.list({ limit: 20 });
            const recentVer = recent.find(e => e.verificationSummary || (e.warnings && e.warnings.length));
            if (recentVer) {
              console.log('\nÚltima verificación / advertencia en historial:');
              if (recentVer.verificationSummary) console.log('  -', recentVer.verificationSummary);
              if (recentVer.warnings && recentVer.warnings.length) console.log('  - warnings:', recentVer.warnings.join('; '));
            }
          })();
        } catch (e) {}
      } else {
        console.log('\nWarnings: none');
      }
    });
}
