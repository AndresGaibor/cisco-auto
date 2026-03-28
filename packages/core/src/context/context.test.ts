import { describe, expect, test, beforeEach } from 'bun:test';
import { ExecutionContext, createStubContext } from './index.ts';

describe('ExecutionContext', () => {
  let ctx: ExecutionContext;

  beforeEach(() => {
    ctx = ExecutionContext.create({
      correlationId: 'test-123',
      verbose: true
    });
  });

  test('crea contexto con correlation ID', () => {
    expect(ctx.correlationId).toBe('test-123');
  });

  test('getLogger retorna logger valido', () => {
    const logger = ctx.getLogger();
    expect(logger).toBeDefined();
    expect(logger.correlationId).toBe('test-123');
  });

  test('getConfig retorna configuracion', () => {
    const config = ctx.getConfig();
    expect(config).toBeDefined();
    expect(config.defaultRouter).toBeDefined();
  });

  test('getBridgeClient retorna cliente del bridge', () => {
    const client = ctx.getBridgeClient();
    expect(client).toBeDefined();
    expect(typeof client.isConnected).toBe('function');
  });

  test('elapsedMs retorna tiempo transcurrido', () => {
    const elapsed = ctx.elapsedMs();
    expect(typeof elapsed).toBe('number');
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  test('isTimedOut retorna false al inicio', () => {
    expect(ctx.isTimedOut()).toBe(false);
  });

  test('fork hereda correlation ID', () => {
    const child = ctx.fork();
    expect(child.correlationId).toBe(ctx.correlationId);
  });

  test('createError genera error estructurado', () => {
    const error = ctx.createError('TEST_ERROR', 'Mensaje de prueba', 100);
    expect(error.correlationId).toBe('test-123');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Mensaje de prueba');
    expect(error.durationMs).toBe(100);
  });
});

describe('createStubContext', () => {
  test('crea contexto stub sin errores', () => {
    const stub = createStubContext();
    expect(stub).toBeDefined();
    expect(stub.correlationId).toBe('stub');
  });

  test('contexto stub tiene logger no-op', () => {
    const stub = createStubContext();
    expect(stub.logger.isDebug()).toBe(false);
  });

  test('contexto stub tiene bridge client offline', async () => {
    const stub = createStubContext();
    const connected = await stub.isBridgeConnected();
    expect(connected).toBe(false);
  });
});

describe('ExecutionContext.run', () => {
  test('ejecuta funcion exitosamente', async () => {
    const ctx = ExecutionContext.create();
    const result = await ctx.run(async () => {
      return 'success';
    });
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.correlationId).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('maneja errores en run', async () => {
    const ctx = ExecutionContext.create();
    const result = await ctx.run(async () => {
      throw new Error('test error');
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('test error');
  });

  test('run con abort signal detecta cancelacion', async () => {
    const controller = new AbortController();
    const ctx = ExecutionContext.create({ abortSignal: controller.signal });
    
    setTimeout(() => controller.abort(), 10);
    
    const result = await ctx.run(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'done';
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Operation cancelled');
  });
});
