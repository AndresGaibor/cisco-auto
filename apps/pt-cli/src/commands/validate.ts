import { Command } from 'commander';
import { loadLab } from '@cisco-auto/core';
import { validateLab } from '@cisco-auto/core';
import type { LabSpec } from '@cisco-auto/core';
// Local definition - ValidationIssue should be exported from core
interface ValidationIssueLocal {
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'physical' | 'logical' | 'topology' | 'best-practice';
  message: string;
  device?: string;
  connection?: string;
  suggestion?: string;
}
import { toLabSpec, type ParsedLabYaml } from '../types/lab-spec.types';

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
    
    const byCategory = new Map<string, ValidationIssueLocal[]>();
    for (const issue of result.issues) {
      const cat = issue.category;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(issue);
    }

    for (const [category, issues] of byCategory) {
      console.log(`\n📁 ${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category}:`);
      
      for (const issue of issues) {
        const severity = issue.severity as keyof typeof SEVERITY_ICONS;
        const icon = SEVERITY_ICONS[severity] ?? '❓';
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
