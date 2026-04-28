// ============================================================================
// RuntimePrimitiveAdapter - Implementación del puerto de primitivas
// ============================================================================
// Conecta con el bridge real del proyecto para ejecutar primitivas en PT.
// No contiene lógica de negocio - solo mapeo de contratos.

import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type { BridgeResultEnvelope } from "@cisco-auto/types";
import type {
  RuntimePrimitivePort,
  PrimitivePortOptions,
  PrimitivePortResult,
} from "../ports/runtime-primitive-port.js";

interface PrimitiveMetadata {
  domain: string;
  description: string;
  supportedPayloadFields: string[];
}

const PRIMITIVE_REGISTRY: Record<string, PrimitiveMetadata> = {
  // Device primitives
  "device.add": {
    domain: "device",
    description: "Añadir un dispositivo a la topología",
    supportedPayloadFields: ["model", "name", "x", "y", "deviceType"],
  },
  "device.remove": {
    domain: "device",
    description: "Eliminar un dispositivo de la topología",
    supportedPayloadFields: ["name"],
  },
  "device.rename": {
    domain: "device",
    description: "Renombrar un dispositivo",
    supportedPayloadFields: ["oldName", "newName"],
  },
  "device.move": {
    domain: "device",
    description: "Mover un dispositivo a nuevas coordenadas",
    supportedPayloadFields: ["name", "x", "y"],
  },
  "device.inspect": {
    domain: "device",
    description: "Inspeccionar estado de un dispositivo",
    supportedPayloadFields: ["device", "includeXml"],
  },
  "device.inspect.fast": {
    domain: "device",
    description: "Inspeccionar rápidamente un dispositivo sin snapshot completo",
    supportedPayloadFields: ["device"],
  },
  "device.ports.list": {
    domain: "device",
    description: "Listar puertos de un dispositivo",
    supportedPayloadFields: ["device"],
  },

  // Link primitives
  "link.add": {
    domain: "link",
    description: "Crear un enlace entre dos dispositivos",
    supportedPayloadFields: ["device1", "port1", "device2", "port2", "cableType"],
  },
  "link.remove": {
    domain: "link",
    description: "Eliminar un enlace",
    supportedPayloadFields: ["device", "port"],
  },

  // Module primitives
  "module.add": {
    domain: "module",
    description: "Añadir un módulo a un dispositivo",
    supportedPayloadFields: ["device", "slot", "module"],
  },
  "module.remove": {
    domain: "module",
    description: "Eliminar un módulo de un dispositivo",
    supportedPayloadFields: ["device", "slot"],
  },
  "module.slots": {
    domain: "module",
    description: "Inspeccionar slots modulares de un dispositivo",
    supportedPayloadFields: ["device"],
  },

  // Topology primitives
  "topology.snapshot": {
    domain: "snapshot",
    description: "Obtener snapshot completo de la topología",
    supportedPayloadFields: [],
  },
  "topology.list": {
    domain: "topology",
    description: "Listar dispositivos y conexiones de la topología",
    supportedPayloadFields: ["filter"],
  },
  "hardware.info": {
    domain: "hardware",
    description: "Obtener información de hardware del dispositivo",
    supportedPayloadFields: ["device"],
  },

  // Canvas primitives
  "canvas.listRects": {
    domain: "canvas",
    description: "Listar todos los rectángulos de canvas (zonas coloreadas)",
    supportedPayloadFields: ["id"],
  },
  "canvas.devicesInRect": {
    domain: "canvas",
    description: "Obtener dispositivos dentro de un rectángulo de canvas",
    supportedPayloadFields: ["id", "rectId", "includeClusters"],
  },
  "canvas.getRect": {
    domain: "canvas",
    description: "Obtener datos detallados de un rectángulo de canvas",
    supportedPayloadFields: ["id", "rectId"],
  },

  // VLAN primitives
  "vlan.ensure": {
    domain: "vlan",
    description: "Asegurar que las VLANs existen en el dispositivo",
    supportedPayloadFields: ["device", "vlans"],
  },
  "vlan.configInterfaces": {
    domain: "vlan",
    description: "Configurar interfaces con VLANs (IP, modo access/trunk)",
    supportedPayloadFields: ["device", "interfaces"],
  },
};

const HANDLER_TYPE_OVERRIDES: Record<string, string> = {
  "device.add": "addDevice",
  "device.remove": "removeDevice",
  "device.rename": "renameDevice",
  "device.move": "moveDevice",
  "device.inspect": "inspect",
  "device.inspect.fast": "inspectDeviceFast",
  "link.add": "addLink",
  "link.remove": "removeLink",
  "module.add": "addModule",
  "module.remove": "removeModule",
  "module.slots": "inspectModuleSlots",
  "topology.snapshot": "snapshot",
  "topology.list": "listDevices",
  "hardware.info": "inspect",
  "canvas.listRects": "listCanvasRects",
  "canvas.devicesInRect": "devicesInRect",
  "canvas.getRect": "getRect",
  "vlan.ensure": "ensureVlans",
  "vlan.configInterfaces": "configVlanInterfaces",
  "host.configure": "configHost",
  "omni.evaluate.raw": "__evaluate",
  "omni.physical.siphon": "omni.physical.siphon",
  "omni.logical.siphonConfigs": "omni.logical.siphonConfigs",
};

function primitiveIdToHandlerType(primitiveId: string): string {
  const override = HANDLER_TYPE_OVERRIDES[primitiveId];
  if (override) {
    return override;
  }
  const dotIndex = primitiveId.indexOf(".");
  if (dotIndex === -1) {
    return primitiveId;
  }
  const action = primitiveId.substring(dotIndex + 1);
  if (!action) {
    return primitiveId;
  }
  return `${action}Device`;
}

function mapBridgeResultToPrimitiveResult(
  bridgeResult: BridgeResultEnvelope<unknown>,
): PrimitivePortResult {
  const timings = bridgeResult.timings;
  const buildEvidence = (base: Record<string, unknown> | undefined): Record<string, unknown> => ({
    ...(base ?? {}),
    id: bridgeResult.id,
    ...(timings ? { timings } : {}),
  });

  if (bridgeResult.status === "timeout") {
    return {
      ok: false,
      error: `Timeout esperando resultado del bridge`,
      code: "BRIDGE_TIMEOUT",
      warnings: [],
      evidence: buildEvidence({
        status: bridgeResult.status,
        ...(bridgeResult.bridgeTimeoutDetails
          ? { bridgeTimeoutDetails: bridgeResult.bridgeTimeoutDetails }
          : {}),
      }),
    };
  }

  if (bridgeResult.status === "failed") {
    const errorDetail = bridgeResult.error;
    return {
      ok: false,
      error: errorDetail?.message ?? "Comando falló en el bridge",
      code: errorDetail?.code ?? "BRIDGE_FAILURE",
      warnings: [],
      evidence: buildEvidence({ status: bridgeResult.status }),
    };
  }

  if (!bridgeResult.ok) {
    return {
      ok: false,
      error: bridgeResult.error?.message ?? "Comando devolvió ok=false sin error",
      code: bridgeResult.error?.code ?? "COMMAND_FAILED",
      warnings: [],
      evidence: buildEvidence({ status: bridgeResult.status }),
    };
  }

  const value = bridgeResult.value as Record<string, unknown> | undefined;
  const warnings = value?.warnings as string[] | undefined;
  const evidence = value?.evidence as Record<string, unknown> | undefined;
  const confidence = value?.confidence as number | undefined;

  return {
    ok: true,
    value: value?.value ?? bridgeResult.value,
    warnings: warnings ?? [],
    evidence: buildEvidence(evidence),
    confidence: confidence ?? 1,
  };
}

/**
 * Adapter para ejecutar primitivas - operaciones de bajo nivel en Packet Tracer.
 *
 * Las primitivas son operaciones fundamentales como addDevice, removeDevice, addLink, etc.
 * Cada primitiva tiene metadata que describe su dominio, descripción y campos requeridos.
 *
 * Este adapter:
 * - Valida que el payload contenga los campos requeridos por la primitiva
 * - Traduce el ID de primitiva al tipo de handler del bridge
 * - Mapea resultados del bridge al formato estándar de PrimitivePortResult
 *
 * @example
 * ```typescript
 * const adapter = new RuntimePrimitiveAdapter(bridge);
 *
 * // Añadir dispositivo
 * const result = await adapter.runPrimitive("device.add", {
 *   model: "2911",
 *   name: "R1",
 *   x: 100,
 *   y: 200
 * });
 * console.log(result.ok); // true
 * ```
 */
export class RuntimePrimitiveAdapter implements RuntimePrimitivePort {
  constructor(private readonly bridge: FileBridgePort) {}

  async runPrimitive(
    id: string,
    payload: unknown,
    options?: PrimitivePortOptions,
  ): Promise<PrimitivePortResult> {
    if (!this.bridge.isReady()) {
      return {
        ok: false,
        error: "Bridge no está listo para aceptar comandos",
        code: "BRIDGE_NOT_READY",
        warnings: [],
        evidence: { primitiveId: id },
      };
    }

    const handlerType = primitiveIdToHandlerType(id);

    const timeoutMs = options?.timeoutMs ?? 60_000;

    let bridgeResult: BridgeResultEnvelope<unknown>;
    try {
      bridgeResult = await this.bridge.sendCommandAndWait(
        handlerType,
        payload,
        timeoutMs,
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Error de transporte: ${error}`,
        code: "TRANSPORT_ERROR",
        warnings: [],
        evidence: { primitiveId: id, handlerType },
      };
    }

    return mapBridgeResultToPrimitiveResult(bridgeResult);
  }

  validatePayload(id: string, payload: unknown): boolean {
    const metadata = this.getPrimitiveMetadata(id);
    if (!metadata) {
      return false;
    }

    if (typeof payload !== "object" || payload === null) {
      return false;
    }

    const payloadObj = payload as Record<string, unknown>;
    const metadataRecord = metadata as unknown as PrimitiveMetadata;
    const supportedFields = metadataRecord.supportedPayloadFields;
    for (const field of supportedFields) {
      if (!(field in payloadObj)) {
        return false;
      }
    }

    return true;
  }

  getPrimitiveMetadata(id: string): Record<string, unknown> | null {
    const metadata = PRIMITIVE_REGISTRY[id];
    if (!metadata) {
      return null;
    }
    return {
      id,
      ...metadata,
    };
  }
}
