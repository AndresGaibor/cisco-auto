// packages/pt-runtime/src/core/registry.ts
// Registro global de handlers
// TODO: Completar con registro real de handlers

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
