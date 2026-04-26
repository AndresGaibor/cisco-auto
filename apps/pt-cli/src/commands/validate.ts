#!/usr/bin/env bun
/**
 * Comando validate - Validar archivo YAML de laboratorio
 * Thin CLI que delega validación a pt-control/application/validate
 */

import { Command } from 'commander';
import { loadLabYaml, toLabSpec, type ParsedLabYaml, type LabSpec } from '../contracts/lab-spec';
import { validateLabUseCase, type ValidationResult } from '@cisco-auto/pt-control/application/validate';

interface ValidationResultExt extends ValidationResult {
  file?: string;
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
function displayResults(result: ValidationResultExt, verbose: boolean): void {
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

    const byCategory = new Map<string, typeof result.issues[0][]>();
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
        const useCaseResult = validateLabUseCase({
          metadata: labSpec.metadata,
          devices: labSpec.devices,
          connections: labSpec.connections,
        } as any);

        if (!useCaseResult.ok) {
          console.error('❌ Error:', useCaseResult.error?.message);
          process.exit(1);
        }

        let result = useCaseResult.data!;

        if (options.warningsAsErrors) {
          result = {
            ...result,
            issues: result.issues.map((i) => ({
              ...i,
              severity: i.severity === 'warning' ? 'error' as const : i.severity,
            })),
            valid: !result.issues.some((i) => i.severity === 'error'),
            summary: {
              ...result.summary,
              errors: result.issues.filter((i) => i.severity === 'error').length,
              warnings: 0,
            },
          };
        }

        const resultExt: ValidationResultExt = { ...result, file };

        if (options.json) {
          console.log(JSON.stringify(resultExt, null, 2));
        } else {
          displayResults(resultExt, options.verbose);
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