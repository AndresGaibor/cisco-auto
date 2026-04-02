import type { TopologyPlan } from '../..';
/** Dispositivo consultado desde Packet Tracer */
export interface QueriedDevice {
    name: string;
    type: string;
}
/** Lista de dispositivos consultados desde Packet Tracer */
export type DeviceList = QueriedDevice[];
/** Resultado de la resolución de nombres */
export interface ResolvedPlan {
    /** Plan con nombres actualizados según Packet Tracer */
    plan: TopologyPlan;
    /** Mapeo: nombre original -> nombre asignado por PT */
    nameMap: Record<string, string>;
    /** Nombres originales que no se pudieron resolver */
    unmatchedOriginalNames: string[];
    /** Nombres en la topología actual que no fueron usados */
    unusedCurrentNames: string[];
}
/**
 * Reconcilia los nombres del plan original con la topología actual consultada.
 *
 * - Si Packet Tracer renombró dispositivos (p. ej. Router1 -> Router1(1)),
 *   esta función intentará mapear los nombres originales a los nombres actuales.
 * - Actualiza también los deviceName dentro de los links del plan.
 */
export declare function resolveDeviceNames(originalPlan: TopologyPlan, currentTopology: DeviceList): ResolvedPlan;
export default resolveDeviceNames;
//# sourceMappingURL=device-name-resolver.d.ts.map