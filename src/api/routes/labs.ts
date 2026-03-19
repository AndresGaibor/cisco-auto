/**
 * LAB ROUTES
 * Endpoints para gestión de laboratorios
 */

import type { Route } from '../server.ts';
import { json, error, readJSON } from '../server.ts';
import { validateLab } from '../../core/validation/index.ts';
import { visualizeTopology, generateMermaidDiagram, analyzeTopology } from '../../core/topology/index.ts';
import type { LabSpec } from '../../core/canonical/index.ts';

// In-memory storage for labs (in production, use a database)
const labs = new Map<string, LabSpec>();

export function createLabRoutes(): Route[] {
  return [
    // List all labs
    {
      method: 'GET',
      path: '/api/labs',
      handler: () => {
        const labList = Array.from(labs.entries()).map(([id, lab]) => ({
          id,
          name: lab.metadata.name,
          deviceCount: lab.devices.length,
          connectionCount: lab.connections.length
        }));
        return json({ labs: labList, total: labList.length });
      }
    },

    // Get lab by ID
    {
      method: 'GET',
      path: '/api/labs/:id',
      handler: (_req, params) => {
        const lab = labs.get(params.id);
        if (!lab) {
          return error('Lab not found', 404);
        }
        return json(lab);
      }
    },

    // Create lab
    {
      method: 'POST',
      path: '/api/labs',
      handler: async (req) => {
        const lab = await readJSON<LabSpec>(req);
        
        // Validate basic structure
        if (!lab.metadata?.name) {
          return error('Lab name is required');
        }

        const id = generateId();
        labs.set(id, lab);

        return json({ id, message: 'Lab created successfully' }, 201);
      }
    },

    // Update lab
    {
      method: 'PUT',
      path: '/api/labs/:id',
      handler: async (req, params) => {
        const existing = labs.get(params.id);
        if (!existing) {
          return error('Lab not found', 404);
        }

        const lab = await readJSON<LabSpec>(req);
        labs.set(params.id, lab);

        return json({ message: 'Lab updated successfully' });
      }
    },

    // Delete lab
    {
      method: 'DELETE',
      path: '/api/labs/:id',
      handler: (_req, params) => {
        if (!labs.has(params.id)) {
          return error('Lab not found', 404);
        }
        labs.delete(params.id);
        return json({ message: 'Lab deleted successfully' });
      }
    },

    // Validate lab
    {
      method: 'POST',
      path: '/api/labs/:id/validate',
      handler: (_req, params) => {
        const lab = labs.get(params.id);
        if (!lab) {
          return error('Lab not found', 404);
        }

        const result = validateLab(lab);
        return json(result);
      }
    },

    // Validate lab JSON directly
    {
      method: 'POST',
      path: '/api/validate',
      handler: async (req) => {
        const lab = await readJSON<LabSpec>(req);
        const result = validateLab(lab);
        return json(result);
      }
    },

    // Get lab topology
    {
      method: 'GET',
      path: '/api/labs/:id/topology',
      handler: (req, params) => {
        const lab = labs.get(params.id);
        if (!lab) {
          return error('Lab not found', 404);
        }

        const url = new URL(req.url);
        const format = url.searchParams.get('format') || 'ascii';

        if (format === 'mermaid') {
          return json({ diagram: generateMermaidDiagram(lab) });
        }

        if (format === 'stats') {
          return json(analyzeTopology(lab));
        }

        return json({ visualization: visualizeTopology(lab) });
      }
    },

    // Generate IOS config for device
    {
      method: 'GET',
      path: '/api/labs/:id/devices/:deviceName/config',
      handler: async (_req, params) => {
        const lab = labs.get(params.id);
        if (!lab) {
          return error('Lab not found', 404);
        }

        const device = lab.devices.find(d => d.name === params.deviceName);
        if (!device) {
          return error('Device not found', 404);
        }

        // Import generator dynamically
        const { IOSConfigGenerator } = await import('../../core/config-generators/ios-generator.ts');
        const generator = new IOSConfigGenerator();
        const config = generator.generateConfig(device);

        return json({ device: device.name, config });
      }
    }
  ];
}

function generateId(): string {
  return `lab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
