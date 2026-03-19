/**
 * API ROUTES TESTS
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createAPIServer } from '../../src/api/server.ts';

const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

describe('REST API', () => {
  let server: any;

  beforeAll(() => {
    server = createAPIServer({ port: TEST_PORT });
  });

  afterAll(() => {
    server?.stop();
  });

  describe('Health & Info', () => {
    test('GET /api/health should return ok', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });

    test('GET /api should return API info', async () => {
      const res = await fetch(`${BASE_URL}/api`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.name).toBe('cisco-auto API');
      expect(data.endpoints).toBeDefined();
    });
  });

  describe('Templates', () => {
    test('GET /api/templates should list templates', async () => {
      const res = await fetch(`${BASE_URL}/api/templates`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.templates).toBeDefined();
      expect(data.total).toBeGreaterThan(0);
    });

    test('GET /api/templates/:id should return template', async () => {
      const res = await fetch(`${BASE_URL}/api/templates/ccna-vlan-basics`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.name).toBe('VLAN Basics');
    });

    test('GET /api/templates/:id should return 404 for invalid id', async () => {
      const res = await fetch(`${BASE_URL}/api/templates/invalid-id`);
      const data = await res.json();
      
      // Should return 404 for invalid template ID
      expect(res.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    test('POST /api/templates/:id/generate should generate lab', async () => {
      const res = await fetch(`${BASE_URL}/api/templates/ccna-vlan-basics/generate`, {
        method: 'POST'
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.lab).toBeDefined();
      expect(data.lab.devices.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    test('POST /api/validate should validate lab', async () => {
      const lab = {
        metadata: { name: 'Test Lab', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [{ name: 'R1', type: 'router' }],
        connections: []
      };

      const res = await fetch(`${BASE_URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lab)
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.valid).toBeDefined();
      expect(data.issues).toBeDefined();
    });

    test('GET /api/validate/categories should return categories', async () => {
      const res = await fetch(`${BASE_URL}/api/validate/categories`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.categories).toBeDefined();
      expect(data.categories.length).toBeGreaterThan(0);
    });
  });

  describe('Labs', () => {
    let labId: string;

    test('POST /api/labs should create lab', async () => {
      const lab = {
        metadata: { name: 'Test Lab', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [{ name: 'R1', type: 'router' }],
        connections: []
      };

      const res = await fetch(`${BASE_URL}/api/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lab)
      });
      const data = await res.json();
      
      expect(res.status).toBe(201);
      expect(data.id).toBeDefined();
      labId = data.id;
    });

    test('GET /api/labs should list labs', async () => {
      const res = await fetch(`${BASE_URL}/api/labs`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.labs).toBeDefined();
    });

    test('GET /api/labs/:id should return lab', async () => {
      const res = await fetch(`${BASE_URL}/api/labs/${labId}`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.metadata.name).toBe('Test Lab');
    });

    test('PUT /api/labs/:id should update lab', async () => {
      const lab = {
        metadata: { name: 'Updated Lab', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [{ name: 'R1', type: 'router' }],
        connections: []
      };

      const res = await fetch(`${BASE_URL}/api/labs/${labId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lab)
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.message).toContain('updated');
    });

    test('POST /api/labs/:id/validate should validate lab', async () => {
      const res = await fetch(`${BASE_URL}/api/labs/${labId}/validate`, {
        method: 'POST'
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.valid).toBeDefined();
    });

    test('DELETE /api/labs/:id should delete lab', async () => {
      const res = await fetch(`${BASE_URL}/api/labs/${labId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.message).toContain('deleted');
    });

    test('GET /api/labs/:id should return 404 after deletion', async () => {
      const res = await fetch(`${BASE_URL}/api/labs/${labId}`);
      
      expect(res.status).toBe(404);
    });
  });

  describe('Topology', () => {
    test('POST /api/topology/analyze should analyze topology', async () => {
      const lab = {
        metadata: { name: 'Test', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [
          { name: 'R1', type: 'router' },
          { name: 'PC1', type: 'pc' }
        ],
        connections: [
          { from: { deviceName: 'R1', portName: 'Gi0/0' }, to: { deviceName: 'PC1', portName: 'Fa0' }, cableType: 'ethernet' }
        ]
      };

      const res = await fetch(`${BASE_URL}/api/topology/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab })
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.deviceCount).toBe(2);
      expect(data.connectionCount).toBe(1);
    });

    test('POST /api/topology/mermaid should generate mermaid diagram', async () => {
      const lab = {
        metadata: { name: 'Test', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [{ name: 'R1', type: 'router' }],
        connections: []
      };

      const res = await fetch(`${BASE_URL}/api/topology/mermaid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab })
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.diagram).toContain('mermaid');
    });
  });

  describe('CORS', () => {
    test('OPTIONS should return CORS headers', async () => {
      const res = await fetch(`${BASE_URL}/api/health`, {
        method: 'OPTIONS'
      });
      
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Error Handling', () => {
    test('GET /api/nonexistent should return 404', async () => {
      const res = await fetch(`${BASE_URL}/api/nonexistent`);
      
      expect(res.status).toBe(404);
    });
  });
});
