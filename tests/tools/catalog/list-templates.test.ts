import { describe, test, expect } from 'bun:test';
import { ptListTemplatesTool, topologyTemplates } from '../../../src/tools/catalog/list-templates.ts';

describe('pt_list_templates', () => {
  test('retorna todos los templates', async () => {
    const result = await ptListTemplatesTool.handler({}, {} as any);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.templates).toHaveLength(topologyTemplates.length);
      expect(result.data.total).toBe(topologyTemplates.length);
    }
  });

  test('cada template tiene nombre y descripcion', async () => {
    const result = await ptListTemplatesTool.handler({}, {} as any);
    
    expect(result.success).toBe(true);
    if (result.success) {
      for (const template of result.data.templates) {
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.parameters).toBeDefined();
      }
    }
  });

  test('incluye template router_on_a_stick', async () => {
    const result = await ptListTemplatesTool.handler({}, {} as any);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const template = result.data.templates.find((t: any) => t.name === 'router_on_a_stick');
      expect(template).toBeDefined();
      expect(template.description).toContain('VLAN');
    }
  });
});
