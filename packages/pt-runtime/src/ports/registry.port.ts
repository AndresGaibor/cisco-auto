import type { HandlerPort } from "./handler.port";

export interface HandlerRegistryPort {
  register(handler: HandlerPort): void;
  getHandler(name: string): HandlerPort | undefined;
  getHandlerForType(type: string): HandlerPort | undefined;
  getAllHandlers(): readonly HandlerPort[];
  getAllSupportedTypes(): string[];
}
