// packages/pt-runtime/src/pt/kernel/command-queue.ts
// Fachada que orquesta los módulos de cola
// - queue-index: lectura/escritura del índice _queue.json
// - queue-discovery: escaneo de archivos en directorio
// - queue-claim: lógica de claim atómico
// - dead-letter: mover archivos fallidos
// - queue-cleanup: cleanup de archivos procesados

import type { CommandEnvelope } from "./types";
import { createQueueIndex } from "./queue-index";
import { createQueueDiscovery } from "./queue-discovery";
import { createDeadLetter } from "./dead-letter";
import { createQueueCleanup } from "./queue-cleanup";
import { createQueueClaim } from "./queue-claim";

export interface CommandQueue {
  poll(): CommandEnvelope | null;
  pollAllowedTypes(allowedTypes: string[]): CommandEnvelope | null;
  cleanup(filename: string): void;
  count(): number;
}

export function createCommandQueue(config: {
  commandsDir: string;
  inFlightDir: string;
  deadLetterDir: string;
}): CommandQueue {
  const queueIndex = createQueueIndex(config.commandsDir);
  const queueDiscovery = createQueueDiscovery(config.commandsDir);
  const deadLetter = createDeadLetter(config.deadLetterDir);
  const cleanup = createQueueCleanup(config.commandsDir, config.inFlightDir, queueIndex);
  const claim = createQueueClaim(
    config.commandsDir,
    config.inFlightDir,
    queueIndex,
    queueDiscovery,
    deadLetter,
  );

  return {
    poll: () => claim.poll(),
    pollAllowedTypes: (allowedTypes: string[]) => claim.pollAllowedTypes(allowedTypes),
    cleanup: (filename: string) => cleanup.cleanup(filename),
    count: () => claim.count(),
  };
}
