/**
 * TEMPLATE ROUTES
 * Endpoints para gestión de plantillas
 */

import type { Route } from '../server';
import { json, error } from '../server';
import { CCNATemplates, getTemplateById, getTemplatesByCategory, getTemplatesByDifficulty } from '@cisco-auto/templates';

export function createTemplateRoutes(): Route[] {
  return [
    // List all templates
    {
      method: 'GET',
      path: '/api/templates',
      handler: (req) => {
        const url = new URL(req.url);
        const category = url.searchParams.get('category');
        const difficulty = url.searchParams.get('difficulty');

        let templates = CCNATemplates;

        if (category) {
          templates = getTemplatesByCategory(category);
        }
        if (difficulty) {
          templates = getTemplatesByDifficulty(difficulty as any);
        }

        const result = templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          difficulty: t.difficulty,
          category: t.category,
          estimatedTime: t.estimatedTime
        }));

        return json({ templates: result, total: result.length });
      }
    },

    // Get template by ID
    {
      method: 'GET',
      path: '/api/templates/:id',
      handler: (_req, params) => {
        const template = getTemplateById(params.id);
        if (!template) {
          return error('Template not found', 404);
        }

        return json({
          id: template.id,
          name: template.name,
          description: template.description,
          difficulty: template.difficulty,
          category: template.category,
          objectives: template.objectives,
          estimatedTime: template.estimatedTime
        });
      }
    },

    // Generate lab from template
    {
      method: 'POST',
      path: '/api/templates/:id/generate',
      handler: (_req, params) => {
        const template = getTemplateById(params.id);
        if (!template) {
          return error('Template not found', 404);
        }

        const lab = template.create();

        return json({
          templateId: template.id,
          templateName: template.name,
          lab
        });
      }
    },

    // Get template preview
    {
      method: 'GET',
      path: '/api/templates/:id/preview',
      handler: (_req, params) => {
        const template = getTemplateById(params.id);
        if (!template) {
          return error('Template not found', 404);
        }

        const lab = template.create();

        return json({
          deviceCount: lab.devices.length,
          connectionCount: lab.connections.length,
          devices: lab.devices.map(d => ({
            name: d.name,
            type: d.type,
            interfaceCount: d.interfaces?.length || 0
          }))
        });
      }
    }
  ];
}
