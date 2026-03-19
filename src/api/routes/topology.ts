/**
 * TOPOLOGY ROUTES
 * Endpoints para visualización y análisis de topología
 */

import type { Route } from '../server.ts';
import { json, error, readJSON } from '../server.ts';
import { visualizeTopology, generateMermaidDiagram, analyzeTopology, generateAdjacencyMatrix } from '../../core/topology/index.ts';
import type { LabSpec } from '../../core/canonical/index.ts';

export function createTopologyRoutes(): Route[] {
  return [
    // Visualize topology
    {
      method: 'POST',
      path: '/api/topology/visualize',
      handler: async (req) => {
        const body = await readJSON<{ lab: LabSpec; options?: { showIPs?: boolean; showPorts?: boolean } }>(req);
        const { lab, options } = body;

        const visualization = visualizeTopology(lab, options);
        return json({ visualization });
      }
    },

    // Generate Mermaid diagram
    {
      method: 'POST',
      path: '/api/topology/mermaid',
      handler: async (req) => {
        const body = await readJSON<{ lab: LabSpec }>(req);
        const { lab } = body;

        const diagram = generateMermaidDiagram(lab);
        return json({ diagram });
      }
    },

    // Analyze topology
    {
      method: 'POST',
      path: '/api/topology/analyze',
      handler: async (req) => {
        const body = await readJSON<{ lab: LabSpec }>(req);
        const { lab } = body;

        const stats = analyzeTopology(lab);
        return json(stats);
      }
    },

    // Generate adjacency matrix
    {
      method: 'POST',
      path: '/api/topology/matrix',
      handler: async (req) => {
        const body = await readJSON<{ lab: LabSpec }>(req);
        const { lab } = body;

        const matrix = generateAdjacencyMatrix(lab);
        return json({ matrix });
      }
    },

    // Full topology analysis
    {
      method: 'POST',
      path: '/api/topology/full',
      handler: async (req) => {
        const body = await readJSON<{ lab: LabSpec }>(req);
        const { lab } = body;

        const [stats, mermaid, ascii] = [
          analyzeTopology(lab),
          generateMermaidDiagram(lab),
          visualizeTopology(lab)
        ];

        return json({
          stats,
          mermaid,
          ascii
        });
      }
    }
  ];
}
