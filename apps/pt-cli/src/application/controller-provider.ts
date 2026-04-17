import { createPTController, type PTController } from "@cisco-auto/pt-control";
import { getDefaultDevDir } from "../system/paths.js";

export function createDefaultPTController(): PTController {
  return createPTController({ devDir: getDefaultDevDir() });
}
