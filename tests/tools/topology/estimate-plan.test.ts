import { describe, test, expect } from 'bun:test';
import { ptEstimatePlanTool } from '@cisco-auto/tools';

describe('pt_estimate_plan', () => {
  test('calcula estimación correcta para 2 routers, 1 switch, 4 PCs', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 2,
      switchCount: 1,
      pcCount: 4,
      serverCount: 0
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedTime).toBe(60);
      expect(result.data.estimatedCost).toBe(15000);
      expect(result.data.complexity).toBe('low');
      expect(result.data.breakdown).toHaveLength(3);
    }
  });

  test('retorna complejidad low para menos de 10 dispositivos', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 1,
      switchCount: 1,
      pcCount: 2,
      serverCount: 0
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.complexity).toBe('low');
      expect(result.data.estimatedTime).toBe(35);
    }
  });

  test('retorna complejidad medium para 10-20 dispositivos', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 2,
      switchCount: 3,
      pcCount: 10,
      serverCount: 2
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.complexity).toBe('medium');
    }
  });

  test('retorna complejidad high para más de 20 dispositivos', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 5,
      switchCount: 5,
      pcCount: 15,
      serverCount: 5
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.complexity).toBe('high');
    }
  });

  test('incluye todos los tipos de dispositivos en breakdown', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 1,
      switchCount: 1,
      pcCount: 1,
      serverCount: 1
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.breakdown).toHaveLength(4);
    }
  });

  test('excluye tipos con cantidad 0 del breakdown', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 2,
      switchCount: 0,
      pcCount: 0,
      serverCount: 0
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.breakdown).toHaveLength(1);
      expect(result.data.breakdown[0].item).toBe('2 Routers');
    }
  });

  test('retorna error para routerCount negativo', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: -1,
      switchCount: 1,
      pcCount: 1,
      serverCount: 0
    }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  test('calcula costos correctos según precios del catálogo', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 1,
      switchCount: 1,
      pcCount: 1,
      serverCount: 1
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedCost).toBe(13000);
    }
  });

  test('calcula tiempos correctos según tiempo por dispositivo', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 1,
      switchCount: 1,
      pcCount: 1,
      serverCount: 1
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedTime).toBe(40);
    }
  });

  test('formatea plurales correctamente en breakdown', async () => {
    const resultSingle = await ptEstimatePlanTool.handler({
      routerCount: 1,
      switchCount: 1,
      pcCount: 1,
      serverCount: 1
    }, {} as any);

    expect(resultSingle.success).toBe(true);
    if (resultSingle.success) {
      expect(resultSingle.data.breakdown[0].item).toBe('1 Router');
      expect(resultSingle.data.breakdown[1].item).toBe('1 Switch');
    }

    const resultMultiple = await ptEstimatePlanTool.handler({
      routerCount: 3,
      switchCount: 2,
      pcCount: 5,
      serverCount: 2
    }, {} as any);

    expect(resultMultiple.success).toBe(true);
    if (resultMultiple.success) {
      expect(resultMultiple.data.breakdown[0].item).toBe('3 Routers');
      expect(resultMultiple.data.breakdown[1].item).toBe('2 Switches');
      expect(resultMultiple.data.breakdown[2].item).toBe('5 PCs');
      expect(resultMultiple.data.breakdown[3].item).toBe('2 Servers');
    }
  });

  test('maneja valores cero correctamente', async () => {
    const result = await ptEstimatePlanTool.handler({
      routerCount: 0,
      switchCount: 0,
      pcCount: 0,
      serverCount: 0
    }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedTime).toBe(0);
      expect(result.data.estimatedCost).toBe(0);
      expect(result.data.complexity).toBe('low');
      expect(result.data.breakdown).toHaveLength(0);
    }
  });
});
