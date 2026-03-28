/**
 * VALIDATION ROUTES
 * Endpoints para validación de laboratorios
 */

import type { Route } from '../server';
import { json, error, readJSON } from '../server';
import { validateLab, LabValidator } from '@cisco-auto/core';
import type { LabSpec } from '@cisco-auto/core';

export function createValidationRoutes(): Route[] {
  return [
    // Validate lab JSON
    {
      method: 'POST',
      path: '/api/validate',
      handler: async (req) => {
        const lab = await readJSON<LabSpec>(req);
        const result = validateLab(lab);
        return json(result);
      }
    },

    // Validate with options
    {
      method: 'POST',
      path: '/api/validate/detailed',
      handler: async (req) => {
        const body = await readJSON<{ lab: LabSpec; options?: { warningsAsErrors?: boolean } }>(req);
        const { lab, options } = body;

        const result = validateLab(lab);

        if (options?.warningsAsErrors) {
          result.issues = result.issues.map(i => ({
            ...i,
            severity: i.severity === 'warning' ? 'error' as const : i.severity
          }));
          result.valid = !result.issues.some(i => i.severity === 'error');
          result.summary.errors = result.issues.filter(i => i.severity === 'error').length;
          result.summary.warnings = 0;
        }

        return json(result);
      }
    },

    // Get validation categories
    {
      method: 'GET',
      path: '/api/validate/categories',
      handler: () => {
        return json({
          categories: [
            { name: 'structure', description: 'Validates YAML structure and required fields' },
            { name: 'physical', description: 'Validates cable and port compatibility' },
            { name: 'logical', description: 'Validates IP addressing and subnet configuration' },
            { name: 'topology', description: 'Validates network topology and connectivity' },
            { name: 'best-practice', description: 'Checks for Cisco best practices' }
          ]
        });
      }
    }
  ];
}
