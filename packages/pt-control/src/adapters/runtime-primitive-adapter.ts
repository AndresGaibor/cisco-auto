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
};

const HANDLER_TYPE_OVERRIDES: Record<string, string> = {
  "device.add": "addDevice",
  "device.remove": "removeDevice",
  "device.rename": "renameDevice",
  "device.move": "moveDevice",
  "device.inspect": "inspect",
  "link.add": "addLink",
  "link.remove": "removeLink",
  "module.add": "addModule",
  "module.remove": "removeModule",
  "topology.snapshot": "snapshot",
  "topology.list": "listDevices",
  "hardware.info": "inspect",
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
  if (bridgeResult.status === "timeout") {
    return {
      ok: false,
      error: `Timeout esperando resultado del bridge`,
      code: "BRIDGE_TIMEOUT",
      warnings: [],
      evidence: { status: bridgeResult.status, id: bridgeResult.id },
    };
  }

  if (bridgeResult.status === "failed") {
    const errorDetail = bridgeResult.error;
    return {
      ok: false,
      error: errorDetail?.message ?? "Comando falló en el bridge",
      code: errorDetail?.code ?? "BRIDGE_FAILURE",
      warnings: [],
      evidence: { status: bridgeResult.status, id: bridgeResult.id },
    };
  }

  if (!bridgeResult.ok) {
    return {
      ok: false,
      error: bridgeResult.error?.message ?? "Comando devolvió ok=false sin error",
      code: bridgeResult.error?.code ?? "COMMAND_FAILED",
      warnings: [],
      evidence: { status: bridgeResult.status, id: bridgeResult.id },
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
    evidence: evidence ?? { id: bridgeResult.id },
    confidence: confidence ?? 1,
  };
}

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
