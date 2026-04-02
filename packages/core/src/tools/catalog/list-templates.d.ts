/**
 * TOOL: pt_list_templates
 *
 * Lista los templates de topología disponibles.
 */
import type { Tool } from '../..';
export declare const topologyTemplates: {
    name: string;
    description: string;
    parameters: ({
        name: string;
        type: string;
        default: number;
        description: string;
    } | {
        name: string;
        type: string;
        default: string;
        description: string;
    })[];
}[];
/**
 * Tool para listar templates de topología
 */
export declare const ptListTemplatesTool: Tool;
//# sourceMappingURL=list-templates.d.ts.map