// packages/pt-runtime/src/core/plugin-api.ts
// Plugin API — Extension points for third-party handlers

import type { MiddlewareFn } from "./middleware";
import type { RuntimeApi, RuntimeResult } from "../runtime/contracts";
import { getLogger, type PtLogger } from "../runtime/logger";

export interface PtPlugin {
  name: string;
  version: string;
  init(api: PluginContext): void;
  destroy?(): void;
}

export interface PluginContext {
  registerHandler(type: string, handler: HandlerFn): void;
  useMiddleware(middleware: MiddlewareFn): void;
  getApi(): RuntimeApi;
  getLogger(name: string): PtLogger;
}

export type HandlerFn = (payload: Record<string, unknown>, api: RuntimeApi) => RuntimeResult;

export class PluginManager {
  private plugins: Record<string, PtPlugin> = {};
  private context: PluginContext;
  private handlerRegistry: Record<string, HandlerFn> = {};
  private middlewareRegistry: MiddlewareFn[] = [];

  constructor(api: RuntimeApi) {
    var self = this;
    this.context = {
      registerHandler: function(type: string, handler: HandlerFn) {
        self.handlerRegistry[type] = handler;
      },
      useMiddleware: function(middleware: MiddlewareFn) {
        self.middlewareRegistry.push(middleware);
      },
      getApi: function() {
        return api;
      },
      getLogger: function(name: string) {
        return getLogger("plugin:" + name).child({ logger: name });
      },
    };
  }

  register(plugin: PtPlugin): void {
    if (this.plugins[plugin.name]) {
      throw new Error("Plugin already registered: " + plugin.name);
    }
    plugin.init(this.context);
    this.plugins[plugin.name] = plugin;
  }

  unregister(name: string): void {
    var plugin = this.plugins[name];
    if (plugin) {
      if (plugin.destroy) {
        plugin.destroy();
      }
      delete this.plugins[name];
    }
  }

  list(): Array<{ name: string; version: string }> {
    var result: Array<{ name: string; version: string }> = [];
    for (var name in this.plugins) {
      if (Object.prototype.hasOwnProperty.call(this.plugins, name)) {
        var plugin = this.plugins[name];
        result.push({ name: plugin.name, version: plugin.version });
      }
    }
    return result;
  }

  has(name: string): boolean {
    return !!this.plugins[name];
  }

  getHandler(type: string): HandlerFn | undefined {
    return this.handlerRegistry[type];
  }

  getMiddleware(): MiddlewareFn[] {
    return this.middlewareRegistry.slice();
  }
}
