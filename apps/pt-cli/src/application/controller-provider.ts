import { createPTController, type PTController } from "@cisco-auto/pt-control/controller";

export function createDefaultPTController(): PTController {
  return createPTController({ devDir: undefined });
}
