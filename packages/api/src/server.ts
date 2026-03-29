/**
 * CISCO-AUTO REST API
 * API para gestión de laboratorios Cisco Packet Tracer
 */

import { serve } from 'bun';
import { createLabRoutes } from './routes/labs.ts';
import { createTemplateRoutes } from './routes/templates.ts';
import { createValidationRoutes } from './routes/validation.ts';
import { createTopologyRoutes } from './routes/topology.ts';

export interface APIServerOptions {
  port?: number;
  host?: string;
}

export interface Route {
  method: string;
  path: string;
  handler: (req: Request, params: Record<string, string>) => Promise<Response> | Response;
}

/**
 * Crea el servidor API REST
 */
export function createAPIServer(options: APIServerOptions = {}) {
  const { port = 3000, host = '0.0.0.0' } = options;

  const routes: Route[] = [
    // Health check
    {
      method: 'GET',
      path: '/api/health',
      handler: () => Response.json({ status: 'ok', timestamp: new Date().toISOString() })
    },
    // API info
    {
      method: 'GET',
      path: '/api',
      handler: () => Response.json({
        name: 'cisco-auto API',
        version: '1.0.0',
        endpoints: [
          'GET    /api/health          - Health check',
          'GET    /api/labs            - List labs',
          'POST   /api/labs            - Create lab',
          'GET    /api/labs/:id        - Get lab by ID',
          'PUT    /api/labs/:id        - Update lab',
          'DELETE /api/labs/:id        - Delete lab',
          'POST   /api/labs/:id/validate - Validate lab',
          'GET    /api/labs/:id/topology - Get topology visualization',
          'GET    /api/templates       - List templates',
          'GET    /api/templates/:id   - Get template',
          'POST   /api/templates/:id/generate - Generate lab from template'
        ]
      })
    },
    // Lab routes
    ...createLabRoutes(),
    // Template routes
    ...createTemplateRoutes(),
    // Validation routes
    ...createValidationRoutes(),
    // Topology routes
    ...createTopologyRoutes()
  ];

  /**
   * Match route pattern
   */
  function matchRoute(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
    for (const route of routes) {
      if (route.method !== method) continue;

      const routeParts = route.path.split('/');
      const pathParts = pathname.split('/');

      if (routeParts.length !== pathParts.length) continue;

      const params: Record<string, string> = {};
      let match = true;

      for (let i = 0; i < routeParts.length; i++) {
        const routePart = routeParts[i];
        const pathPart = pathParts[i];
        if (!routePart || !pathPart) {
          match = false;
          break;
        }
        if (routePart.startsWith(':')) {
          params[routePart.slice(1)] = pathPart;
        } else if (routePart !== pathPart) {
          match = false;
          break;
        }
      }

      if (match) {
        return { route, params };
      }
    }

    return null;
  }

  /**
   * Handle CORS
   */
  function corsHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
  }

  const server = serve({
    port,
    hostname: host,

    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const { method, pathname } = { method: req.method, pathname: url.pathname };

      // Handle CORS preflight
      if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
      }

      // Match route
      const matched = matchRoute(method, pathname);

      if (!matched) {
        return Response.json(
          { error: 'Not Found', path: pathname },
          { status: 404, headers: corsHeaders() }
        );
      }

      try {
        const response = await matched.route.handler(req, matched.params);
        // Add CORS headers to response
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(corsHeaders())) {
          headers.set(key, value);
        }
        return new Response(response.body, { 
          status: response.status,
          statusText: response.statusText,
          headers 
        });
      } catch (error) {
        console.error('Route error:', error);
        return Response.json(
          { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500, headers: corsHeaders() }
        );
      }
    }
  });

  console.log(`🚀 API server running at http://${host}:${port}`);
  console.log(`📚 API docs: http://${host}:${port}/api`);

  return server;
}

/**
 * Helper para leer JSON del body
 */
export async function readJSON<T>(req: Request): Promise<T> {
  return await req.json() as T;
}

/**
 * Helper para respuestas JSON
 */
export function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Helper para errores
 */
export function error(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
