// packages/pt-runtime/src/core/registry.ts
/**
 * HandlerRegistry — provides handler registration and lookup.
 *
 * @deprecated Not used by the compiled runtime.js output.
 * The compiled runtime uses a simpler object-based dispatcher in handlers/runtime-handlers.ts.
 * This registry is retained for future extensibility or alternative build paths.
 */

import type { HandlerPort, HandlerRegistryPort } from "../ports";

export class HandlerRegistry implements HandlerRegistryPort {
  private handlers: Record<string, HandlerPort> = {};

  register(handler: HandlerPort): void {
    this.handlers[handler.type] = handler;
  }

  getHandler(name: string): HandlerPort | undefined {
    return this.handlers[name];
  }

  getHandlerForType(type: string): HandlerPort | undefined {
    return this.handlers[type];
  }

  getAllHandlers(): readonly HandlerPort[] {
    return Object.keys(this.handlers).map((key) => this.handlers[key]);
  }

  getAllSupportedTypes(): string[] {
    return Object.keys(this.handlers);
  }

  clear(): void {
    this.handlers = {};
  }
}

export const globalRegistry = new HandlerRegistry();
