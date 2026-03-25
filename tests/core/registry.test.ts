/**
 * TESTS PARA TOOL REGISTRY
 * 
 * Tests unitarios con TDD (RED → GREEN → REFACTOR)
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import type { Tool, ToolInput, ToolExecutionContext } from '../../src/core/types/tool';
import { ToolRegistry } from '../../src/core/registry';
import { RegistryErrorCode } from '../../src/core/registry/types';

// =============================================================================
// HELPERS
// =============================================================================

/** Crea una tool de test simple */
function createTestTool(overrides: Partial<Tool> = {}): Tool {
  return {
    name: 'test_tool',
    description: 'A test tool',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'A message' }
      },
      required: ['message']
    },
    handler: async (input: ToolInput) => {
      return { success: true, data: { echo: input.message } };
    },
    category: 'utility',
    tags: ['test'],
    ...overrides
  };
}

/** Crea un mock de ToolExecutionContext */
function createMockContext(): ToolExecutionContext {
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    },
    config: {
      workingDir: '/tmp',
      outputDir: '/tmp/output',
      verbose: false,
      outputFormat: 'json'
    },
    bridgeClient: {
      isAvailable: vi.fn().mockResolvedValue(false),
      execute: vi.fn(),
      getStatus: vi.fn(),
      getTopology: vi.fn()
    },
    signal: undefined,
    timeout: 5000
  };
}

// =============================================================================
// CONSTRUCTOR
// =============================================================================

describe('ToolRegistry Constructor', () => {
  test('crea instancia vacía', () => {
    const registry = new ToolRegistry();
    expect(registry.list()).toHaveLength(0);
  });

  test('crea instancia con tools iniciales', () => {
    const tool1 = createTestTool({ name: 'tool1' });
    const tool2 = createTestTool({ name: 'tool2' });
    const registry = new ToolRegistry([tool1, tool2]);
    
    expect(registry.list()).toHaveLength(2);
    expect(registry.has('tool1')).toBe(true);
    expect(registry.has('tool2')).toBe(true);
  });
});

// =============================================================================
// REGISTER
// =============================================================================

describe('ToolRegistry.register', () => {
  test('registra una tool exitosamente', () => {
    const registry = new ToolRegistry();
    const tool = createTestTool();
    
    registry.register(tool);
    
    expect(registry.has('test_tool')).toBe(true);
    expect(registry.get('test_tool')).toEqual(tool);
  });

  test('lanza error si la tool ya existe', () => {
    const registry = new ToolRegistry();
    const tool = createTestTool();
    
    registry.register(tool);
    
    expect(() => registry.register(tool)).toThrow('Tool test_tool ya esta registrada');
  });

  test('permite registrar tool con nombre diferente', () => {
    const registry = new ToolRegistry();
    const tool1 = createTestTool({ name: 'tool1' });
    const tool2 = createTestTool({ name: 'tool2' });
    
    registry.register(tool1);
    registry.register(tool2);
    
    expect(registry.list()).toHaveLength(2);
  });

  test('registra tool sin categoría', () => {
    const registry = new ToolRegistry();
    const tool = createTestTool({ category: undefined });
    
    registry.register(tool);
    
    expect(registry.has('test_tool')).toBe(true);
  });
});

// =============================================================================
// UNREGISTER
// =============================================================================

describe('ToolRegistry.unregister', () => {
  test('elimina tool existente y retorna true', () => {
    const registry = new ToolRegistry();
    const tool = createTestTool();
    registry.register(tool);
    
    const result = registry.unregister('test_tool');
    
    expect(result).toBe(true);
    expect(registry.has('test_tool')).toBe(false);
    expect(registry.list()).toHaveLength(0);
  });

  test('retorna false si la tool no existe', () => {
    const registry = new ToolRegistry();
    
    const result = registry.unregister('no_existe');
    
    expect(result).toBe(false);
  });

  test('permite registrar nuevamente después de eliminar', () => {
    const registry = new ToolRegistry();
    const tool = createTestTool();
    
    registry.register(tool);
    registry.unregister('test_tool');
    registry.register(tool);
    
    expect(registry.has('test_tool')).toBe(true);
    expect(registry.list()).toHaveLength(1);
  });
});

// =============================================================================
// GET
// =============================================================================

describe('ToolRegistry.get', () => {
  test('obtiene tool por nombre', () => {
    const registry = new ToolRegistry();
    const tool = createTestTool({ name: 'mi_tool', description: 'Mi descripcion' });
    registry.register(tool);
    
    const found = registry.get('mi_tool');
    
    expect(found).toBeDefined();
    expect(found?.name).toBe('mi_tool');
    expect(found?.description).toBe('Mi descripcion');
  });

  test('retorna undefined si no existe', () => {
    const registry = new ToolRegistry();
    
    const found = registry.get('no_existe');
    
    expect(found).toBeUndefined();
  });

  test('retorna undefined para nombre vacío', () => {
    const registry = new ToolRegistry();
    
    const found = registry.get('');
    
    expect(found).toBeUndefined();
  });
});

// =============================================================================
// LIST
// =============================================================================

describe('ToolRegistry.list', () => {
  test('lista todas las tools', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1' }));
    registry.register(createTestTool({ name: 'tool2' }));
    registry.register(createTestTool({ name: 'tool3' }));
    
    const tools = registry.list();
    
    expect(tools).toHaveLength(3);
  });

  test('retorna array vacío si no hay tools', () => {
    const registry = new ToolRegistry();
    
    const tools = registry.list();
    
    expect(tools).toEqual([]);
  });

  test('no retorna tools desregistradas', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1' }));
    registry.register(createTestTool({ name: 'tool2' }));
    registry.register(createTestTool({ name: 'tool3' }));
    registry.unregister('tool2');
    
    const tools = registry.list();
    
    expect(tools).toHaveLength(2);
    expect(tools.map(t => t.name)).toEqual(['tool1', 'tool3']);
  });
});

// =============================================================================
// LIST BY CATEGORY
// =============================================================================

describe('ToolRegistry.listByCategory', () => {
  test('filtra tools por categoría', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1', category: 'catalog' }));
    registry.register(createTestTool({ name: 'tool2', category: 'topology' }));
    registry.register(createTestTool({ name: 'tool3', category: 'catalog' }));
    
    const catalogTools = registry.listByCategory('catalog');
    
    expect(catalogTools).toHaveLength(2);
    expect(catalogTools.map(t => t.name)).toEqual(['tool1', 'tool3']);
  });

  test('retorna array vacío si no hay tools en categoría', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1', category: 'catalog' }));
    
    const topologyTools = registry.listByCategory('topology');
    
    expect(topologyTools).toEqual([]);
  });

  test('incluye tools sin categoría', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1', category: 'catalog' }));
    registry.register(createTestTool({ name: 'tool2', category: undefined }));
    
    // El comportamiento depende de la implementación - undefined vs 'utility'
    const catalogTools = registry.listByCategory('catalog');
    expect(catalogTools).toHaveLength(1);
  });
});

// =============================================================================
// SEARCH
// =============================================================================

describe('ToolRegistry.search', () => {
  test('busca por nombre', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'list_devices', description: 'Lista dispositivos' }));
    registry.register(createTestTool({ name: 'deploy_config', description: 'Despliega configuración' }));
    
    const results = registry.search('devices');
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('list_devices');
  });

  test('busca por descripción', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1', description: 'Lista todos los dispositivos de red' }));
    registry.register(createTestTool({ name: 'tool2', description: 'Configura VLANs' }));
    
    const results = registry.search('dispositivos');
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('tool1');
  });

  test('busca por tags', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1', tags: ['network', 'cisco', 'routing'] }));
    registry.register(createTestTool({ name: 'tool2', tags: ['security', 'acl'] }));
    
    const results = registry.search('cisco');
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('tool1');
  });

  test('busca sin query retorna todas', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1' }));
    registry.register(createTestTool({ name: 'tool2' }));
    
    const results = registry.search('');
    
    expect(results).toHaveLength(2);
  });

  test('búsqueda es case-insensitive', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'ListDevices', description: 'Lista dispositivos' }));
    
    const results1 = registry.search('LIST');
    const results2 = registry.search('list');
    
    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
  });

  test('retorna array vacío si no hay matches', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'tool1', description: 'Foo bar' }));
    
    const results = registry.search('xyz');
    
    expect(results).toEqual([]);
  });
});

// =============================================================================
// HAS
// =============================================================================

describe('ToolRegistry.has', () => {
  test('retorna true para tool registrada', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'mi_tool' }));
    
    expect(registry.has('mi_tool')).toBe(true);
  });

  test('retorna false para tool no registrada', () => {
    const registry = new ToolRegistry();
    
    expect(registry.has('no_existe')).toBe(false);
  });

  test('retorna false para nombre vacío', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool());
    
    expect(registry.has('')).toBe(false);
  });
});

// =============================================================================
// EXECUTE
// =============================================================================

describe('ToolRegistry.execute', () => {
  test('ejecuta tool exitosamente', async () => {
    const registry = new ToolRegistry();
    const handler = vi.fn().mockResolvedValue({ success: true, data: { result: 'ok' } });
    registry.register(createTestTool({ name: 'exec_tool', handler }));
    
    const context = createMockContext();
    const result = await registry.execute('exec_tool', { message: 'hello' }, context);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ result: 'ok' });
    }
  });

  test('retorna error si la tool no existe', async () => {
    const registry = new ToolRegistry();
    const context = createMockContext();
    
    const result = await registry.execute('no_existe', { message: 'test' }, context);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(RegistryErrorCode.TOOL_NOT_FOUND);
    }
  });

  test('pasa el contexto a la tool handler', async () => {
    const registry = new ToolRegistry();
    const handler = vi.fn().mockResolvedValue({ success: true, data: {} });
    registry.register(createTestTool({ name: 'context_tool', handler }));
    
    const context = createMockContext();
    await registry.execute('context_tool', { message: 'test' }, context);
    
    expect(handler).toHaveBeenCalledWith(
      { message: 'test' },
      expect.objectContaining({
        logger: expect.any(Object),
        config: expect.any(Object)
      })
    );
  });

  test('maneja errores del handler', async () => {
    const registry = new ToolRegistry();
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    registry.register(createTestTool({ name: 'error_tool', handler }));
    
    const context = createMockContext();
    const result = await registry.execute('error_tool', { message: 'test' }, context);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(RegistryErrorCode.EXECUTION_FAILED);
    }
  });

  test('incluye metadata de duración en resultado exitoso', async () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({
      name: 'meta_tool',
      handler: async () => {
        await new Promise(r => setTimeout(r, 10));
        return { success: true, data: {} };
      }
    }));
    
    const context = createMockContext();
    const result = await registry.execute('meta_tool', { message: 'test' }, context);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata?.duration).toBeDefined();
    }
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('ToolRegistry Edge Cases', () => {
  test('registra múltiples tools con diferentes categorías', () => {
    const registry = new ToolRegistry();
    
    registry.register(createTestTool({ name: 't1', category: 'catalog' }));
    registry.register(createTestTool({ name: 't2', category: 'topology' }));
    registry.register(createTestTool({ name: 't3', category: 'validation' }));
    registry.register(createTestTool({ name: 't4', category: 'generation' }));
    registry.register(createTestTool({ name: 't5', category: 'deploy' }));
    registry.register(createTestTool({ name: 't6', category: 'analysis' }));
    registry.register(createTestTool({ name: 't7', category: 'utility' }));
    
    expect(registry.list()).toHaveLength(7);
    
    // Verificar cada categoría
    expect(registry.listByCategory('catalog')).toHaveLength(1);
    expect(registry.listByCategory('topology')).toHaveLength(1);
    expect(registry.listByCategory('utility')).toHaveLength(1);
  });

  test('busca con múltiples términos', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ 
      name: 'deploy_vlan', 
      description: 'Deploys VLAN configuration',
      tags: ['vlan', 'deploy', 'cisco']
    }));
    
    const results1 = registry.search('vlan');
    const results2 = registry.search('deploy');
    const results3 = registry.search('cisco');
    
    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
    expect(results3).toHaveLength(1);
  });

  test('tool sin tags no falla búsqueda', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'no_tags', tags: undefined }));
    
    // Buscar por nombre debería funcionar sin tags
    const results = registry.search('no_tags');
    
    expect(results).toHaveLength(1);
  });

  test('tool sin description no falla búsqueda', () => {
    const registry = new ToolRegistry();
    registry.register(createTestTool({ name: 'no_desc', description: '' }));
    
    const results = registry.search('test');
    
    // No debe fallar, simplemente no matcheará por description
    expect(Array.isArray(results)).toBe(true);
  });
});
