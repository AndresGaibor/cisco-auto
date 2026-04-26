// packages/pt-runtime/src/build/templates/entry-points.ts
// PT Script Module lifecycle entry points template
// main() and cleanUp() — called by Packet Tracer lifecycle

/**
 * Returns the entry points template string.
 * Contains main() and cleanUp() functions for PT Script Module lifecycle.
 */
export function entryPointsTemplate(params: {
  devDirLiteral: string;
  buildTimestamp: string;
}): string {
  const { devDirLiteral, buildTimestamp } = params;

  return `
// PT Script Module entry points — called by Packet Tracer lifecycle

function main() {
  var _g    = (typeof self !== "undefined") ? self : this;
  var devDir = (typeof DEV_DIR !== "undefined") ? DEV_DIR : (_g.DEV_DIR || ${devDirLiteral});

  if (typeof dprint === "function") dprint("[main] PT-SCRIPT v2 active (build: " + "${buildTimestamp}" + ")");

  // Initialize fm from ipc BEFORE any module loads.
  // In PT, 'fm' is NOT a direct global — it must be obtained from ipc.systemFileManager().
  // The kernel also does this in boot(), but _ptLoadModule runs before kernel.boot().
  if (!_g.fm) {
    var _ipc = (typeof ipc !== "undefined") ? ipc : null;
    if (_ipc && typeof _ipc.systemFileManager === "function") {
      var _fm = _ipc.systemFileManager();
      if (_fm) _g.fm = _fm;
    }
  }

  // Step 1: load static catalog (device/cable type constants)
  _ptLoadModule(devDir + "/catalog.js", "catalog");

  // Step 2: boot the kernel.
  // The kernel's internal runtime-loader handles:
  //   - loading runtime.js from devDir/runtime.js on first boot
  //   - hot-reloading whenever runtime.js file changes on disk
  try {
    if (typeof createKernel === "function") {
      _g.createKernel = createKernel;
      var kernel = createKernel({
        devDir:                 devDir,
        commandsDir:            devDir + "/commands",
        inFlightDir:            devDir + "/in-flight",
        resultsDir:             devDir + "/results",
        deadLetterDir:          devDir + "/dead-letter",
        logsDir:                devDir + "/logs",
        commandsTraceDir:       devDir + "/logs/commands",
        pollIntervalMs:         1000,
        deferredPollIntervalMs: 500,
        heartbeatIntervalMs:    5000,
        demoRuntime:            false,
      });
      _g._kernelInstance = kernel;
      try {
        kernel.boot();
      } catch(e) {
        if (typeof dprint === "function") dprint("[main] FATAL: " + String(e));
      }
      if (typeof dprint === "function") {
        dprint(
          "[main] kernel-flags boot=" + String(!!_g.__ptKernelBootEntered) +
          " leaseBypass=" + String(!!_g.__ptKernelLeaseBypass) +
          " activate=" + String(!!_g.__ptKernelActivateEntered) +
          " runtimeAttempt=" + String(!!_g.__ptRuntimeLoadAttempted) +
          " runtimeOK=" + String(!!_g.__ptRuntimeLoadSucceeded)
        );
      }
      if (_g.__ptRuntimeLoadError && typeof dprint === "function") {
        dprint("[main] runtime-error=" + String(_g.__ptRuntimeLoadError));
      }
      if (_g.__ptRuntimeLoaded === true && typeof dprint === "function") {
        dprint("[main] runtime-loaded flag = true");
      }
      if (typeof dprint === "function") dprint("[main] kernel booted — runtime hot-reload active");
    } else {
      if (typeof dprint === "function") dprint("[main] ERROR: createKernel not found");
    }
  } catch(e) {
    if (typeof dprint === "function") dprint("[main] FATAL kernel bootstrap: " + String(e));
  }
}

function cleanUp() {
  if (typeof shutdownKernel === "function") {
    shutdownKernel();
  }
}
`;
}
