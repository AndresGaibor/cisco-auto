/**
 * Factory functions for PTController.
 *
 * Provides convenient ways to create PTController instances with different
 * configuration options.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { createControlComposition, type ControlComposition, type ControlCompositionConfig } from "../application/bootstrap/control-composition.js";
import { PTController } from "./pt-controller.js";

function getDefaultDevDir(): string {
  const home = homedir();
  const isWindows = process.platform === "win32";
  if (isWindows) {
    return process.env.PT_DEV_DIR ?? join(home, "pt-dev");
  }
  return process.env.PT_DEV_DIR ?? join(home, "pt-dev");
}

export interface PTControllerConfig {
  devDir?: string;
  resultTimeoutMs?: number;
}

/**
 * Creates a PTController instance.
 *
 * @param config - Optional configuration or a pre-built ControlComposition.
 *                  If undefined, creates with default settings.
 *                  If object with devDir property, uses that configuration.
 *                  If ControlComposition object, uses it directly.
 */
export function createPTController(config?: PTControllerConfig | ControlComposition): PTController {
  if (config === undefined) {
    const devDir = getDefaultDevDir();
    const bridge = new FileBridgeV2({ root: devDir, resultTimeoutMs: 10_000 });
    const composition = createControlComposition({ bridge });
    return new PTController(composition);
  }
  if (typeof config === "object" && "devDir" in config) {
    const devDir = config.devDir ?? getDefaultDevDir();
    const bridge = new FileBridgeV2({
      root: devDir,
      resultTimeoutMs: config.resultTimeoutMs ?? 10_000,
    });
    const composition = createControlComposition({ bridge });
    return new PTController(composition);
  }
  return new PTController(config as ControlComposition);
}

/**
 * Creates a PTController with default settings (uses PT_DEV_DIR or ~/pt-dev).
 */
export function createDefaultPTController(): PTController {
  return createPTController({ devDir: getDefaultDevDir() });
}
