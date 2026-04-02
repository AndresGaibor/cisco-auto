/**
 * TOOL: pt_list_devices
 *
 * Lista los dispositivos disponibles en el catálogo de Packet Tracer.
 */
import type { Tool } from '../..';
export declare const deviceCatalog: ({
    name: string;
    type: string;
    ptType: string;
    description: string;
    ports: {
        name: string;
        type: string;
        speed: string;
        available: boolean;
    }[];
    maxModules: number;
    defaultIOS: string;
} | {
    name: string;
    type: string;
    ptType: string;
    description: string;
    ports: {
        name: string;
        type: string;
        speed: string;
        available: boolean;
    }[];
    maxModules: number;
    defaultIOS: null;
})[];
/**
 * Tool para listar dispositivos del catálogo
 */
export declare const ptListDevicesTool: Tool;
//# sourceMappingURL=list-devices.d.ts.map