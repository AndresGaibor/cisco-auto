// packages/pt-runtime/src/core/registry.ts
/**
 * HandlerRegistry — provides handler registration and lookup.
 *
 * @deprecated Not used by the compiled runtime.js output.
 * The compiled runtime uses a simpler Map-based dispatcher in handlers/runtime-handlers.ts.
 * This registry is retained for future extensibility or alternative build paths.
 */

import type { HandlerPort, HandlerRegistryPort } from "../ports";

export class HandlerRegistry implements HandlerRegistryPort {
  private handlers = new Map<string, HandlerPort>();

  register(handler: HandlerPort): void {
    this.handlers.set(handler.type, handler);
  }

  getHandler(name: string): HandlerPort | undefined {
    return this.handlers.get(name);
  }

  getHandlerForType(type: string): HandlerPort | undefined {
    return this.handlers.get(type);
  }

  getAllHandlers(): readonly HandlerPort[] {
    return Array.from(this.handlers.values());
  }

  getAllSupportedTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const globalRegistry = new HandlerRegistry();
