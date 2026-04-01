import { Command } from 'commander';
import { loadLab } from '@cisco-auto/core';
import { DeployOrchestrator, deployToDevice } from '@cisco-auto/core';
import type { ConnectionCredentials, DeployOptions, DeployResult, DeviceType } from '@cisco-auto/core';
import type { DeviceSpec, LabSpec } from '@cisco-auto/core';
import type { ParsedLabYaml } from '../types/lab-spec.types';

/**
 * Convierte un YAML parsed a LabSpec con tipos explícitos
 */
function convertParsedLabToLabSpec(parsed: ParsedLabYaml): LabSpec {
  return {
    metadata: {
      name: parsed.lab?.metadata?.name ?? 'Lab',
      version: '1.0',
      author: 'cisco-auto',
      createdAt: new Date()
    },
    devices: parsed.lab?.topology?.devices?.map(d => ({
      id: `device-${d.name}-${Date.now()}`,
      name: d.name ?? '',
      type: d.type as DeviceType,
      interfaces: d.interfaces?.map(i => ({
        name: i.name ?? '',
        description: i.description,
        ip: i.ip,
        shutdown: !(i as { enabled?: boolean }).enabled,
        switchportMode: i.mode,
        vlan: i.vlan
      })) ?? []
    })) ?? [],
    connections: parsed.lab?.topology?.connections?.map(c => {
      const fromDevice = typeof c.from === 'string' ? c.from : (c.from?.device ?? '');
      const fromPort = typeof c.from === 'string' ? (c.fromInterface ?? 'unknown') : (c.from?.port ?? c.fromInterface ?? 'unknown');
      const toDevice = typeof c.to === 'string' ? c.to : (c.to?.device ?? '');
      const toPort = typeof c.to === 'string' ? (c.toInterface ?? 'unknown') : (c.to?.port ?? c.toInterface ?? 'unknown');

      return {
        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        from: { deviceName: fromDevice, port: fromPort, deviceId: '' },
        to: { deviceName: toDevice, port: toPort, deviceId: '' },
        cableType: c.type ?? 'ethernet'
      };
    }) ?? []
  };
}

/**
 * Obtiene credenciales para un dispositivo
 * Soporta variables de entorno y archivo de credenciales
 */
function getCredentials(device: DeviceSpec): ConnectionCredentials | null {
  // Primero intentar obtener de variables de entorno
  const host = device.managementIp || process.env[`DEVICE_${device.name.toUpperCase()}_IP`];
  const username = process.env[`DEVICE_${device.name.toUpperCase()}_USER`] || 
                   process.env.CISCO_USER || 
                   process.env.SSH_USER;
  const password = process.env[`DEVICE_${device.name.toUpperCase()}_PASS`] || 
                   process.env.CISCO_PASS || 
                   process.env.SSH_PASS;
  const enablePassword = process.env[`DEVICE_${device.name.toUpperCase()}_ENABLE`] || 
                         process.env.CISCO_ENABLE;

  if (!host || !username || !password) {
    return null;
  }

  return {
    host,
    username,
    password,
    enablePassword
  };
}

/**
 * Formatea el resultado del despliegue para consola
 */
function formatResult(result: DeployResult): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    RESUMEN DE DESPLIEGUE                       ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Duración total: ${(result.duration / 1000).toFixed(2)}s`);
  lines.push(`Estado: ${result.success ? '✅ EXITOSO' : '❌ FALLIDO'}`);
  lines.push('');
  lines.push('Resumen por dispositivo:');
  lines.push('─'.repeat(60));
  
  for (const device of result.devices) {
    const status = device.success ? '✅' : '❌';
    const duration = (device.duration / 1000).toFixed(2);
    lines.push(`  ${status} ${device.deviceName.padEnd(20)} ${duration.padStart(8)}s`);
    
    if (device.errors.length > 0) {
      for (const error of device.errors) {
        lines.push(`      ⚠️  ${error.message}`);
      }
    }
    
    if (device.warnings.length > 0) {
      for (const warning of device.warnings) {
        lines.push(`      ℹ️  ${warning}`);
      }
    }
  }
  
  lines.push('─'.repeat(60));
  lines.push(`Total: ${result.summary.total} | ` +
             `Exitosos: ${result.summary.successful} | ` +
             `Fallidos: ${result.summary.failed} | ` +
             `Omitidos: ${result.summary.skipped}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

export function createDeployCommand(): Command {
  return new Command('deploy')
    .description('Desplegar configuraciones a dispositivos Cisco')
    .argument('<file>', 'Archivo YAML del laboratorio')
    .option('-d, --device <name>', 'Desplegar solo en dispositivo específico')
    .option('--dry-run', 'Simular despliegue sin conectar a dispositivos')
    .option('-c, --concurrency <n>', 'Número máximo de conexiones paralelas', '5')
    .option('--timeout <ms>', 'Timeout por comando en ms', '30000')
    .option('--no-backup', 'No guardar backup antes del despliegue')
    .option('--backup-dir <path>', 'Directorio para backups', './backups')
    .option('--no-validate', 'No validar después del despliegue')
    .option('--continue-on-error', 'Continuar aunque un dispositivo falle', true)
    .option('-v, --verbose', 'Mostrar información detallada')
    .action(async (file, options) => {
      console.log('🚀 Despliegue de configuraciones Cisco');
      console.log(`📄 Archivo: ${file}`);
      
      // Parsear laboratorio
      let lab: LabSpec;
      try {
        const parsed = loadLab(file);
        // Convertir a LabSpec usando función tipada
        lab = convertParsedLabToLabSpec(parsed);
      } catch (error) {
        const err = error as Error;
        console.error(`❌ Error parseando archivo: ${err.message}`);
        process.exit(1);
      }

      // Filtrar dispositivo específico si se indica
      if (options.device) {
        lab.devices = lab.devices.filter(d => d.name === options.device);
        if (lab.devices.length === 0) {
          console.error(`❌ Dispositivo "${options.device}" no encontrado`);
          process.exit(1);
        }
      }

      // Configurar opciones de despliegue
      const deployOptions: Partial<DeployOptions> = {
        dryRun: options.dryRun,
        concurrency: parseInt(options.concurrency),
        commandTimeout: parseInt(options.timeout),
        connectionTimeout: parseInt(options.timeout),
        validateAfter: options.validate !== false,
        autoRollback: false,
        saveBackup: options.backup !== false && !options.dryRun,
        backupDir: options.backupDir,
        continueOnError: options.continueOnError,
        verbose: options.verbose
      };

      if (options.dryRun) {
        console.log('\n📋 MODO SIMULACIÓN (dry-run)');
        console.log('─'.repeat(60));
      }

      // Crear orquestador
      const orchestrator = new DeployOrchestrator(deployOptions);

      // Ejecutar despliegue
      try {
        const result = await orchestrator.deployLab(lab, getCredentials);
        
        // Mostrar resultado
        console.log(formatResult(result));

        // Salir con código de error si falló
        if (!result.success) {
          process.exit(1);
        }
      } catch (error) {
        const err = error as Error;
        console.error(`\n❌ Error durante el despliegue: ${err.message}`);
        process.exit(1);
      }
    });
}
