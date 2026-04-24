import type { LabSpec } from '../contracts/lab-spec';

export interface LabTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  objectives: string[];
  estimatedTime: number;
  create: () => LabSpec;
}

export const CCNATemplates: LabTemplate[] = [
  {
    id: 'ccna-vlan-basics',
    name: 'VLAN Basics',
    description: 'Configuración básica de VLANs y puertos de acceso',
    difficulty: 'beginner',
    category: 'Switching',
    objectives: ['Crear VLANs 10, 20, 30', 'Asignar puertos Fa0/1-3'],
    estimatedAt: 15,
    estimatedTime: 15,
    create: () => ({
      metadata: { name: 'VLAN Basics', version: '1.0', author: 'cisco-auto' },
      devices: [
        { id: 'S1', name: 'Switch1', type: 'switch', hostname: 'S1', interfaces: [], vlans: [] },
        { id: 'PC1', name: 'PC1', type: 'pc', interfaces: [{ name: 'FastEthernet0', ip: '192.168.10.10/24' }] },
      ],
      connections: []
    })
  } as any,
  // Agregar más si es necesario, por ahora uno para validar
];

export function getTemplateById(id: string): LabTemplate | undefined {
  return CCNATemplates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): LabTemplate[] {
  return CCNATemplates.filter(t => t.category === category);
}

export function getTemplatesByDifficulty(difficulty: string): LabTemplate[] {
  return CCNATemplates.filter(t => t.difficulty === difficulty);
}
