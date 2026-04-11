import type { HandlerPort, HandlerRegistryPort } from "../ports";

export class HandlerRegistry implements HandlerRegistryPort {
  private readonly handlers = new Map<string, HandlerPort>();
  private readonly handlersByType = new Map<string, HandlerPort>();

  register(handler: HandlerPort): void {
    if (this.handlers.has(handler.name)) {
      throw new Error(`Handler ya registrado: ${handler.name}`);
    }

    this.handlers.set(handler.name, handler);

    for (const type of handler.supportedTypes) {
      const existing = this.handlersByType.get(type);
      if (existing && existing.name !== handler.name) {
        throw new Error(`Tipo de payload ya registrado: ${type}`);
      }

      this.handlersByType.set(type, handler);
    }
  }

  getHandler(name: string): HandlerPort | undefined {
    return this.handlers.get(name);
  }

  getHandlerForType(type: string): HandlerPort | undefined {
    return this.handlersByType.get(type);
  }

  getAllHandlers(): readonly HandlerPort[] {
    return Array.from(this.handlers.values());
  }

  getAllSupportedTypes(): string[] {
    return Array.from(this.handlersByType.keys());
  }

  clear(): void {
    this.handlers.clear();
    this.handlersByType.clear();
  }
}

export const globalRegistry = new HandlerRegistry();
