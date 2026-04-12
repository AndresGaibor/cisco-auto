#!/usr/bin/env bun
/**
 * Comando validate - Validar archivo YAML de laboratorio
 * 
 * Implementación local sin dependencias de @cisco-auto/core.
 */

import { Command } from 'commander';
import { loadLabYaml, toLabSpec, type ParsedLabYaml, type LabSpec } from '../contracts/lab-spec';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'physical' | 'logical' | 'topology' | 'best-practice';
  message: string;
  device?: string;
  connection?: string;
  suggestion?: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Valida un laboratorio y retorna issues detallados
 */
function validateLab(spec: LabSpec): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Validación de estructura
  if (!spec.metadata?.name) {
    issues.push({
      severity: 'warning',
      category: 'structure',
      message: 'El laboratorio no tiene nombre definido',
      suggestion: 'Agrega metadata.name en el archivo YAML'
    });
  }

  if (!spec.devices || spec.devices.length === 0) {
    issues.push({
      severity: 'error',
      category: 'structure',
      message: 'No hay dispositivos definidos'
    });
    return { valid: false, issues, summary: { errors: issues.filter(i => i.severity === 'error').length, warnings: issues.filter(i => i.severity === 'warning').length, info: issues.filter(i => i.severity === 'info').length } };
  }

  // Validar dispositivos duplicados
  const deviceNames = new Map<string, string[]>();
  for (const device of spec.devices) {
    const name = device.name;
    if (!deviceNames.has(name)) {
      deviceNames.set(name, []);
    }
    deviceNames.get(name)!.push(device.id);

    if (!device.hostname) {
      issues.push({
        severity: 'warning',
        category: 'structure',
        message: `Dispositivo '${name}' no tiene hostname`,
        device: name,
        suggestion: 'Define un hostname para identificación en IOS'
      });
    }
  }

  for (const [name, ids] of deviceNames) {
    if (ids.length > 1) {
      issues.push({
        severity: 'error',
        category: 'structure',
        message: `Dispositivo duplicado: '${name}' aparece ${ids.length} veces`,
        suggestion: 'Cada dispositivo debe tener un nombre único'
      });
    }
  }

  // Validar conexiones
  const deviceNameSet = new Set(spec.devices.map(d => d.name));
  for (const conn of spec.connections) {
    if (!deviceNameSet.has(conn.from.deviceName)) {
      issues.push({
        severity: 'error',
        category: 'topology',
        message: `Conexión refiere dispositivo inexistente: '${conn.from.deviceName}'`,
        connection: `${conn.from.deviceName} -> ${conn.to.deviceName}`
      });
    }
    if (!deviceNameSet.has(conn.to.deviceName)) {
      issues.push({
        severity: 'error',
        category: 'topology',
        message: `Conexión refiere dispositivo inexistente: '${conn.to.deviceName}'`,
        connection: `${conn.from.deviceName} -> ${conn.to.deviceName}`
      });
    }
  }

  // Validar routers sin interfaces
  for (const device of spec.devices) {
    if (device.type === 'router' && (!device.interfaces || device.interfaces.length === 0)) {
      issues.push({
        severity: 'warning',
        category: 'physical',
        message: `Router '${device.name}' no tiene interfaces definidas`,
        device: device.name,
        suggestion: 'Los routers necesitan al menos una interfaz configurada'
      });
    }
  }

  // Validar switches con VLANs sin trunk
  for (const device of spec.devices) {
    if (device.type === 'switch' && device.vlans && (device.vlans as any[]).length > 0) {
      const hasTrunk = spec.connections.some(conn =>
        (conn.from.deviceName === device.name || conn.to.deviceName === device.name) &&
        String(conn.cableType).includes('trunk')
      );
      if (!hasTrunk && spec.devices.filter(d => d.type === 'switch').length > 1) {
        issues.push({
          severity: 'info',
          category: 'best-practice',
          message: `Switch '${device.name}' tiene VLANs pero no hay enlace trunk detectado`,
          device: device.name,
          suggestion: 'Configura un puerto trunk para comunicación inter-switch'
        });
      }
    }
  }

  // Validar PCs sin IP
  for (const device of spec.devices) {
    if (device.type === 'pc' && device.interfaces && device.interfaces.length > 0) {
      const hasIP = device.interfaces.some(i => i.ip);
      if (!hasIP) {
        issues.push({
          severity: 'info',
          category: 'logical',
          message: `PC '${device.name}' no tiene IP configurada`,
          device: device.name,
          suggestion: 'Configura IP estática o habilita DHCP'
        });
      }
    }
  }

  // Dispositivos aislados
  const connectedDevices = new Set<string>();
  for (const conn of spec.connections) {
    connectedDevices.add(conn.from.deviceName);
    connectedDevices.add(conn.to.deviceName);
  }
  for (const device of spec.devices) {
    if (!connectedDevices.has(device.name)) {
      issues.push({
        severity: 'warning',
        category: 'topology',
        message: `Dispositivo '${device.name}' no tiene conexiones`,
        device: device.name,
        suggestion: 'Conecta el dispositivo a la topología'
      });
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const info = issues.filter(i => i.severity === 'info').length;

  return {
    valid: errors === 0,
    issues,
    summary: { errors, warnings, info }
  };
}

const SEVERITY_ICONS = {
  error: '❌',
  warning: '⚠️ ',
  info: 'ℹ️ '
};

const CATEGORY_LABELS = {
  'structure': 'Structure',
  'physical': 'Physical',
  'logical': 'Logical',
  'topology': 'Topology',
  'best-practice': 'Best Practice'
};

/**
 * Formatea y muestra los resultados de validación
 */
function displayResults(result: ValidationResult, verbose: boolean): void {
  console.log('\n' + '═'.repeat(60));
  console.log('                    VALIDATION RESULTS');
  console.log('═'.repeat(60));

  const { summary } = result;
  console.log(`\n📊 Summary:`);
  console.log(`   Errors:   ${summary.errors}`);
  console.log(`   Warnings: ${summary.warnings}`);
  console.log(`   Info:     ${summary.info}`);

  if (result.issues.length > 0) {
    console.log('\n' + '─'.repeat(60));

    const byCategory = new Map<string, ValidationIssue[]>();
    for (const issue of result.issues) {
      const cat = issue.category;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(issue);
    }

    for (const [category, categoryIssues] of byCategory) {
      console.log(`\n📁 ${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category}:`);

      for (const issue of categoryIssues) {
        const icon = SEVERITY_ICONS[issue.severity] ?? '❓';
        let line = `   ${icon} ${issue.message}`;

        if (issue.device) {
          line += ` [${issue.device}]`;
        }

        console.log(line);

        if (verbose && issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(60));

  if (result.valid) {
    console.log('✅ Lab validation PASSED');
  } else {
    console.log('❌ Lab validation FAILED');
  }
  console.log('');
}

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate lab YAML file with comprehensive checks')
    .argument('<file>', 'YAML lab file to validate')
    .option('-v, --verbose', 'Show detailed suggestions', false)
    .option('--json', 'Output as JSON', false)
    .option('--warnings-as-errors', 'Treat warnings as errors', false)
    .action(async (file, options) => {
      try {
        console.log('🔍 Validating lab file:', file);

        const parsed = loadLabYaml(file);
        const labSpec = toLabSpec(parsed);
        const result = validateLab(labSpec);

        if (options.warningsAsErrors) {
          result.issues = result.issues.map(i => ({
            ...i,
            severity: i.severity === 'warning' ? 'error' as const : i.severity
          }));
          result.valid = !result.issues.some(i => i.severity === 'error');
          result.summary.errors = result.issues.filter(i => i.severity === 'error').length;
          result.summary.warnings = 0;
        }

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          displayResults(result, options.verbose);
        }

        if (!result.valid) {
          process.exit(1);
        }

      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
