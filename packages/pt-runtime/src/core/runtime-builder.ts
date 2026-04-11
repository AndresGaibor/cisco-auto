import { generateCanvasHandlersTemplate } from "../templates/canvas-handlers-template";
import { generateConstantsTemplate } from "../templates/constants-template";
import { generateDeviceHandlersTemplate } from "../templates/device-handlers-template";
import { generateHelpersTemplate } from "../templates/helpers-template";
import { generateInspectHandlersTemplate } from "../templates/inspect-handlers-template";
import { generateIosConfigHandlersTemplate } from "../templates/ios-config-handlers-template";
import { generateIosExecHandlersTemplate } from "../templates/ios-exec-handlers-template";
import { MAIN_JS_TEMPLATE } from "../templates/main-kernel";
import { generateSessionTemplate } from "../templates/session-template";
import { generateDispatcherTemplate } from "../templates/dispatcher-template";
import type { HandlerRegistryPort } from "../ports";
import { globalRegistry } from "./registry";

export interface RuntimeBuildResult {
  main: string;
  runtime: string;
}

export class RuntimeBuilder {
  constructor(private readonly registry: HandlerRegistryPort = globalRegistry) {}

  buildRuntime(): string {
    const sections = [
      generateConstantsTemplate(),
      generateHelpersTemplate(),
      generateSessionTemplate(),
      generateDeviceHandlersTemplate(),
      generateIosConfigHandlersTemplate(),
      generateIosExecHandlersTemplate(),
      generateInspectHandlersTemplate(),
      generateCanvasHandlersTemplate(),
      generateDispatcherTemplate(),
    ];

    return sections.filter(Boolean).join("\n\n");
  }

  buildMainKernel(): string {
    return MAIN_JS_TEMPLATE;
  }

  buildAll(): RuntimeBuildResult {
    return {
      main: this.buildMainKernel(),
      runtime: this.buildRuntime(),
    };
  }

  getRegisteredTypes(): string[] {
    return this.registry.getAllSupportedTypes();
  }
}
