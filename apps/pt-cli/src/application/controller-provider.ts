import { createPTController, type PTController } from "@cisco-auto/pt-control";

export function createDefaultPTController(): PTController {
  return createPTController({ devDir: undefined });
}
