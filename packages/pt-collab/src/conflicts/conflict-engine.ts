import type { CollabDelta, CollabScope } from "../protocol/messages.js";
import type { ConflictDecision, CollabConflictType } from "./conflict-types.js";

export interface ConflictEngineOptions {
  lastWriterWins?: boolean;
  allowAutoMergeVlan?: boolean;
  allowAutoMergeDescription?: boolean;
}

export function evaluateDeltaConflict(
  incoming: CollabDelta,
  localDeltas: CollabDelta[],
  options?: ConflictEngineOptions,
): ConflictDecision {
  if (incoming.kind === "topology.device.removed" && localDeltas.some((d) => d.scope.startsWith("device:"))) {
    return {
      action: "conflict",
      reason: "El dispositivo se eliminó remotamente pero tiene cambios locales",
      conflict: createConflictDescriptor(incoming, "device.removed_vs_edited"),
    };
  }

  if (incoming.kind === "device.xml.changed") {
    return { action: "conflict", reason: "XML merge no está soportado", conflict: createConflictDescriptor(incoming, "xml.unsafe_merge") };
  }

  const localInSameScope = localDeltas.filter((d) => d.scope === incoming.scope);

  if (localInSameScope.length === 0) {
    return { action: "apply", reason: "No hay cambios locales en este scope" };
  }

  const currentScope = incoming.scope;
  const scopeType = extractScopeType(currentScope);

  const lastLocal = localInSameScope[localInSameScope.length - 1] as CollabDelta | undefined;
  const isLastWriter = lastLocal ? incoming.lamport > lastLocal.lamport : true;

  if (scopeType === "device" && incoming.scope.endsWith("running-config")) {
    return evaluateConfigConflict(incoming, localInSameScope, options);
  }

  if (scopeType === "topology" || scopeType === "link") {
    return evaluateTopologyConflict(incoming, localInSameScope, options);
  }

  if (scopeType === "device" && incoming.scope.endsWith("xml")) {
    return { action: "conflict", reason: "XML merge no está soportado", conflict: createConflictDescriptor(incoming, "xml.unsafe_merge") };
  }

  if (options?.lastWriterWins && isLastWriter) {
    return { action: "apply", reason: "last-writer-wins: incoming tiene timestamp mayor" };
  }

  return {
    action: "conflict",
    reason: "Cambios concurrentes en el mismo scope (default: conflicto)",
    conflict: createConflictDescriptor(incoming, "device.concurrent_edit"),
  };
}

function extractScopeType(scope: CollabScope): string {
  if (scope === "project") return "project";
  if (scope === "topology") return "topology";
  if (scope.startsWith("device:")) return "device";
  if (scope.startsWith("link:")) return "link";
  if (scope.startsWith("canvas:")) return "canvas";
  if (scope.startsWith("multiuser:")) return "multiuser";
  return "unknown";
}

function evaluateConfigConflict(
  incoming: CollabDelta,
  localDeltas: CollabDelta[],
  options?: ConflictEngineOptions,
): ConflictDecision {
  const incomingPayload = incoming.payload as { commands?: string[] } | undefined;
  const incomingCommands = incomingPayload?.commands ?? [];

  for (const local of localDeltas) {
    const localPayload = local.payload as { commands?: string[] } | undefined;
    const localCommands = localPayload?.commands ?? [];

    if (commandsOverlap(incomingCommands, localCommands)) {
      return {
        action: "conflict",
        reason: "Cambios concurrentes en las mismas secciones de configuración",
        conflict: createConflictDescriptor(incoming, "config.concurrent_section_edit"),
      };
    }
  }

  return {
    action: "autoMerge",
    reason: "Los comandos no se superponen, merge seguro",
    mergedDelta: incoming,
  };
}

function evaluateTopologyConflict(
  incoming: CollabDelta,
  localDeltas: CollabDelta[],
  options?: ConflictEngineOptions,
): ConflictDecision {
  for (const local of localDeltas) {
    if (incoming.kind === "topology.link.created" && local.kind === "topology.link.created") {
      const incPort = extractPortFromPayload(incoming.payload);
      const locPort = extractPortFromPayload(local.payload);

      if (incPort && locPort && incPort === locPort) {
        return {
          action: "conflict",
          reason: `El puerto ${incPort} ya está siendo usado por otro enlace`,
          conflict: createConflictDescriptor(incoming, "link.port_busy"),
        };
      }
    }

    if (incoming.kind === "topology.device.removed" && local.kind !== "topology.device.removed") {
      return {
        action: "conflict",
        reason: `El dispositivo se eliminó remotamente pero tiene cambios locales`,
        conflict: createConflictDescriptor(incoming, "device.removed_vs_edited"),
      };
    }
  }

  return { action: "apply", reason: "No hay conflicto de topología detectable" };
}

function commandsOverlap(a: string[], b: string[]): boolean {
  const sectionsA = extractSections(a);
  const sectionsB = extractSections(b);
  for (const s of sectionsA) {
    if (sectionsB.has(s)) return true;
  }
  return false;
}

function extractSections(commands: string[]): Set<string> {
  const sections = new Set<string>();
  let currentSection = "";

  for (const cmd of commands) {
    const trimmed = cmd.trim();
    if (trimmed.startsWith("interface ")) {
      currentSection = trimmed;
      sections.add(currentSection);
    } else if (trimmed.startsWith("vlan ") || trimmed.startsWith("router ")) {
      currentSection = trimmed;
      sections.add(currentSection);
    }
  }

  return sections;
}

function extractPortFromPayload(payload: unknown): string | null {
  const p = payload as Record<string, unknown> | undefined;
  if (!p) return null;

  if (typeof p.port1 === "string") return p.port1;
  if (typeof p.port2 === "string") return p.port2;
  if (typeof p.port === "string") return p.port;
  return null;
}

function createConflictDescriptor(
  delta: CollabDelta,
  type: CollabConflictType,
): Omit<import("./conflict-types.js").CollabConflict, "id" | "createdAt"> {
  return {
    roomId: delta.roomId,
    type,
    scope: delta.scope,
    peerIds: [delta.peerId],
    description: `Conflicto detectado al aplicar delta ${delta.id} de tipo ${delta.kind}`,
    deltas: [delta.id],
  };
}
