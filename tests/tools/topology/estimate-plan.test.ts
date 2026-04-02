import { describe, test, expect } from 'bun:test';
import { ptEstimatePlanTool } from '@cisco-auto/core/tools';

interface EstimateBreakdown {
  item: string;
  count: number;
  unitCost: number;
  unitTime: number;
}

interface EstimateData {
  estimatedTime: number;
  estimatedCost: number;
  complexity: 'low' | 'medium' | 'high';
  breakdown: EstimateBreakdown[];
}

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
      const data = result.data as EstimateData;
      expect(data.estimatedTime).toBe(60);
      expect(data.estimatedCost).toBe(15000);
      expect(data.complexity).toBe('low');
      expect(data.breakdown).toHaveLength(3);
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
      const data = result.data as EstimateData;
      expect(data.complexity).toBe('low');
      expect(data.estimatedTime).toBe(35);
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
      const data = result.data as EstimateData;
      expect(data.complexity).toBe('medium');
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
      const data = result.data as EstimateData;
      expect(data.complexity).toBe('high');
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
      const data = result.data as EstimateData;
      expect(data.breakdown).toHaveLength(4);
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
      const data = result.data as EstimateData;
      expect(data.breakdown).toHaveLength(1);
      expect(data.breakdown[0]!.item).toBe('2 Routers');
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
      const data = result.data as EstimateData;
      expect(data.estimatedCost).toBe(13000);
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
      const data = result.data as EstimateData;
      expect(data.estimatedTime).toBe(40);
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
      const dataSingle = resultSingle.data as EstimateData;
      expect(dataSingle.breakdown[0]!.item).toBe('1 Router');
      expect(dataSingle.breakdown[1]!.item).toBe('1 Switch');
    }

    const resultMultiple = await ptEstimatePlanTool.handler({
      routerCount: 3,
      switchCount: 2,
      pcCount: 5,
      serverCount: 2
    }, {} as any);

    expect(resultMultiple.success).toBe(true);
    if (resultMultiple.success) {
      const dataMultiple = resultMultiple.data as EstimateData;
      expect(dataMultiple.breakdown[0]!.item).toBe('3 Routers');
      expect(dataMultiple.breakdown[1]!.item).toBe('2 Switches');
      expect(dataMultiple.breakdown[2]!.item).toBe('5 PCs');
      expect(dataMultiple.breakdown[3]!.item).toBe('2 Servers');
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
      const data = result.data as EstimateData;
      expect(data.estimatedTime).toBe(0);
      expect(data.estimatedCost).toBe(0);
      expect(data.complexity).toBe('low');
      expect(data.breakdown).toHaveLength(0);
    }
  });
});
