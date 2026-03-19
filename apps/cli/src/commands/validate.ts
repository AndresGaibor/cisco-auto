import { Command } from 'commander';
import { loadLab } from '../../../../src/core/parser/yaml-parser.ts';
import { validateLab } from '../../../../src/core/validation/lab.validator.ts';
import type { LabSpec } from '../../../../src/core/canonical/index.ts';
import type { ValidationIssue } from '../../../../src/core/validation/lab.validator.ts';

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
 * Convierte Lab del parser a LabSpec
 */
function toLabSpec(parsed: any): LabSpec {
  return {
    metadata: {
      name: parsed.lab?.metadata?.name || 'Lab',
      version: parsed.lab?.metadata?.version || '1.0',
      author: parsed.lab?.metadata?.author || 'unknown',
      created: new Date().toISOString()
    },
    devices: (parsed.lab?.topology?.devices || []).map((d: any) => ({
      name: d.name,
      type: d.type,
      hostname: d.hostname || d.name,
      managementIp: d.management?.ip,
      interfaces: (d.interfaces || []).map((i: any) => ({
        name: i.name,
        description: i.description,
        ipAddress: i.ip,
        shutdown: i.shutdown,
        switchport: i.mode ? {
          mode: i.mode,
          accessVlan: i.vlan
        } : undefined
      })),
      security: d.security
    })),
    connections: (parsed.lab?.topology?.connections || []).map((c: any) => ({
      from: { deviceName: c.from.device || c.from, portName: c.from.port || c.fromInterface || 'unknown' },
      to: { deviceName: c.to.device || c.to, portName: c.to.port || c.toInterface || 'unknown' },
      cableType: c.cable || c.type || 'ethernet'
    }))
  };
}

/**
 * Formatea y muestra los resultados de validación
 */
function displayResults(result: ReturnType<typeof validateLab>, verbose: boolean): void {
  console.log('\n' + '═'.repeat(60));
  console.log('                    VALIDATION RESULTS');
  console.log('═'.repeat(60));

  // Summary
  const { summary } = result;
  console.log(`\n📊 Summary:`);
  console.log(`   Errors:   ${summary.errors}`);
  console.log(`   Warnings: ${summary.warnings}`);
  console.log(`   Info:     ${summary.info}`);

  // Group issues by category
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

    for (const [category, issues] of byCategory) {
      console.log(`\n📁 ${CATEGORY_LABELS[category]}:`);
      
      for (const issue of issues) {
        const icon = SEVERITY_ICONS[issue.severity];
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
        
        // Parse YAML
        const parsed = loadLab(file);
        
        // Convert to LabSpec
        const labSpec = toLabSpec(parsed);
        
        // Run validation
        const result = validateLab(labSpec);
        
        // Handle warnings-as-errors
        if (options.warningsAsErrors) {
          result.issues = result.issues.map(i => ({
            ...i,
            severity: i.severity === 'warning' ? 'error' as const : i.severity
          }));
          result.valid = !result.issues.some(i => i.severity === 'error');
          result.summary.errors = result.issues.filter(i => i.severity === 'error').length;
          result.summary.warnings = 0;
        }
        
        // Output
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          displayResults(result, options.verbose);
        }
        
        // Exit code
        if (!result.valid) {
          process.exit(1);
        }
        
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
