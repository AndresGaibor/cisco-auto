/**
 * CCNA LAB TEMPLATES
 * Plantillas pre-configuradas para laboratorios CCNA
 */
import type { LabSpec } from '../../canonical';
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
/**
 * Template: VLAN Básico
 * Un switch con 3 VLANs y 3 PCs
 */
export declare const vlanBasicsTemplate: LabTemplate;
/**
 * Template: Static Routing
 * Dos routers conectados con rutas estáticas
 */
export declare const staticRoutingTemplate: LabTemplate;
/**
 * Template: OSPF Single Area
 * Tres routers con OSPF en área 0
 */
export declare const ospfSingleAreaTemplate: LabTemplate;
/**
 * Template: ACL Basics
 * Router con ACLs para filtrar tráfico
 */
export declare const aclBasicsTemplate: LabTemplate;
/**
 * Template: DHCP Server
 * Router configurado como servidor DHCP
 */
export declare const dhcpServerTemplate: LabTemplate;
/**
 * Registry de todos los templates
 */
export declare const CCNATemplates: LabTemplate[];
/**
 * Busca un template por ID
 */
export declare function getTemplateById(id: string): LabTemplate | undefined;
/**
 * Busca templates por categoría
 */
export declare function getTemplatesByCategory(category: string): LabTemplate[];
/**
 * Busca templates por dificultad
 */
export declare function getTemplatesByDifficulty(difficulty: LabTemplate['difficulty']): LabTemplate[];
//# sourceMappingURL=index.d.ts.map