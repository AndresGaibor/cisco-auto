# bundle entrypoints dump

Fecha: Tue Apr 28 12:50:51 -05 2026

## package scripts
```json
{
  "name": "@cisco-auto/pt-runtime",
  "version": "0.1.0",
  "description": "Packet Tracer runtime generator - generates main.js and runtime.js for PT",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./src/index.ts",
    "./value-objects": "./src/value-objects/index.ts"
  },
  "scripts": {
    "build": "echo runtime built via deploy",
    "build:watch": "tsc -p tsconfig.runtime.json --watch",
    "typecheck": "tsc --noEmit && tsc -p tsconfig.runtime.json --noEmit",
    "lint": "eslint src/ --max-warnings 0",
    "format": "prettier --write 'src/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts'",
    "clean": "rm -rf dist build generated",
    "validate:api": "bun run src/build/validate-pt-api.ts",
    "generate-models": "bun run src/scripts/generate-model-map.ts",
    "generate": "bun run src/cli.ts generate",
    "validate": "bun run src/cli.ts validate",
    "deploy": "bun run src/cli.ts deploy",
    "test": "bun test"
  },
  "dependencies": {
    "@cisco-auto/types": "workspace:*"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5"
  }
}```

## runtime cli/build files
```
packages/pt-runtime/src/README.md
packages/pt-runtime/src/__tests__/api-expansion-smoke.test.ts
packages/pt-runtime/src/__tests__/architecture/runtime-handlers-boundary.test.ts
packages/pt-runtime/src/__tests__/build/ast-transform.test.ts
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts
packages/pt-runtime/src/__tests__/build/main-manifest-order.test.ts
packages/pt-runtime/src/__tests__/build/main-runtime-contract.test.ts
packages/pt-runtime/src/__tests__/build/manifest-dependency-validator.test.ts
packages/pt-runtime/src/__tests__/build/preflight-validation.test.ts
packages/pt-runtime/src/__tests__/build/render-main-v2.test.ts
packages/pt-runtime/src/__tests__/build/runtime-generator-report.test.ts
packages/pt-runtime/src/__tests__/build/runtime-manifest-order.test.ts
packages/pt-runtime/src/__tests__/canvas-clear.test.ts
packages/pt-runtime/src/__tests__/deep-inspect.test.ts
packages/pt-runtime/src/__tests__/deprecated/ios-engine.test.ts
packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts
packages/pt-runtime/src/__tests__/device-handler.test.ts
packages/pt-runtime/src/__tests__/device-xml-parser.real.test.ts
packages/pt-runtime/src/__tests__/device-xml-parser.test.ts
packages/pt-runtime/src/__tests__/domain/deferred-job-plan.test.ts
packages/pt-runtime/src/__tests__/domain/runtime-result.test.ts
packages/pt-runtime/src/__tests__/handlers/canvas.test.ts
packages/pt-runtime/src/__tests__/handlers/deferred-poll-handler.test.ts
packages/pt-runtime/src/__tests__/handlers/device-link-contract.test.ts
packages/pt-runtime/src/__tests__/handlers/device.test.ts
packages/pt-runtime/src/__tests__/handlers/dhcp.test.ts
packages/pt-runtime/src/__tests__/handlers/handler-registry.test.ts
packages/pt-runtime/src/__tests__/handlers/host.test.ts
packages/pt-runtime/src/__tests__/handlers/inspect-fast.test.ts
packages/pt-runtime/src/__tests__/handlers/inspect.test.ts
packages/pt-runtime/src/__tests__/handlers/ios-execution.test.ts
packages/pt-runtime/src/__tests__/handlers/ios-output-classifier.test.ts
packages/pt-runtime/src/__tests__/handlers/ios-session-helpers.test.ts
packages/pt-runtime/src/__tests__/handlers/link-registry.test.ts
packages/pt-runtime/src/__tests__/handlers/link.test.ts
packages/pt-runtime/src/__tests__/handlers/list-links.test.ts
packages/pt-runtime/src/__tests__/handlers/live-link.test.ts
packages/pt-runtime/src/__tests__/handlers/module.test.ts
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts
packages/pt-runtime/src/__tests__/handlers/runtime-device-config-wiring.test.ts
packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts
packages/pt-runtime/src/__tests__/handlers/runtime-handler-wiring.test.ts
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts
packages/pt-runtime/src/__tests__/handlers/vlan.test.ts
packages/pt-runtime/src/__tests__/harness/pt-script-result-parser.test.ts
packages/pt-runtime/src/__tests__/kernel-debug-logging.test.ts
packages/pt-runtime/src/__tests__/parser-robustness.test.ts
packages/pt-runtime/src/__tests__/prompt-state-contract.test.ts
packages/pt-runtime/src/__tests__/pt-api-registry.test.ts
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts
packages/pt-runtime/src/__tests__/pt/kernel.test.ts
packages/pt-runtime/src/__tests__/pt/kernel/command-finalizer.test.ts
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts
packages/pt-runtime/src/__tests__/pt/queue-poller.test.ts
packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts
packages/pt-runtime/src/__tests__/pt/terminal-session.test.ts
packages/pt-runtime/src/__tests__/queue-claim.test.ts
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts
packages/pt-runtime/src/__tests__/runtime-validator.test.ts
packages/pt-runtime/src/__tests__/runtime/logger.test.ts
packages/pt-runtime/src/__tests__/runtime/runtime-entry.test.ts
packages/pt-runtime/src/__tests__/session.test.ts
packages/pt-runtime/src/__tests__/terminal/command-state-machine.test.ts
packages/pt-runtime/src/__tests__/terminal/terminal-utils.test.ts
packages/pt-runtime/src/__tests__/utils/helpers.collect-ports.test.ts
packages/pt-runtime/src/__tests__/utils/parser-generator.test.ts
packages/pt-runtime/src/__tests__/validate-pt-api.test.ts
packages/pt-runtime/src/__tests__/value-objects/cable-type.test.ts
packages/pt-runtime/src/__tests__/value-objects/device-name.test.ts
packages/pt-runtime/src/__tests__/value-objects/hardware-maps.test.ts
packages/pt-runtime/src/__tests__/value-objects/interface-name.test.ts
packages/pt-runtime/src/__tests__/value-objects/session-mode.test.ts
packages/pt-runtime/src/build/__tests__/catalog-generator.test.ts
packages/pt-runtime/src/build/__tests__/compile-to-module.test.ts
packages/pt-runtime/src/build/__tests__/generated-asset-checks.test.ts
packages/pt-runtime/src/build/__tests__/main-generator.test.ts
packages/pt-runtime/src/build/__tests__/runtime-manifest.test.ts
packages/pt-runtime/src/build/__tests__/runtime-module-manifest.test.ts
packages/pt-runtime/src/build/__tests__/templates.test.ts
packages/pt-runtime/src/build/__tests__/validate-pt-safe.test.ts
packages/pt-runtime/src/build/__tests__/validation-warnings.test.ts
packages/pt-runtime/src/build/ast-pt-safe-validator.ts
packages/pt-runtime/src/build/ast-transform.ts
packages/pt-runtime/src/build/ast-transforms/arrow-to-function.transform.ts
packages/pt-runtime/src/build/ast-transforms/class-to-function-constructor.transform.ts
packages/pt-runtime/src/build/ast-transforms/default-params-to-checks.transform.ts
packages/pt-runtime/src/build/ast-transforms/destructuring-to-assignment.transform.ts
packages/pt-runtime/src/build/ast-transforms/for-of-to-for-loop.transform.ts
packages/pt-runtime/src/build/ast-transforms/index.ts
packages/pt-runtime/src/build/ast-transforms/let-const-to-var.transform.ts
packages/pt-runtime/src/build/ast-transforms/nullish-coalescing-to-logical.transform.ts
packages/pt-runtime/src/build/ast-transforms/optional-chaining-to-logical.transform.ts
packages/pt-runtime/src/build/ast-transforms/remove-imports-exports.transform.ts
packages/pt-runtime/src/build/ast-transforms/remove-type-annotations.transform.ts
packages/pt-runtime/src/build/ast-transforms/spread-to-object-assign.transform.ts
packages/pt-runtime/src/build/ast-transforms/template-literal-to-concat.transform.ts
packages/pt-runtime/src/build/ast-transforms/types.ts
packages/pt-runtime/src/build/ast/compile-to-module.ts
packages/pt-runtime/src/build/ast/index.ts
packages/pt-runtime/src/build/catalog-generator.ts
packages/pt-runtime/src/build/checksum.ts
packages/pt-runtime/src/build/generated-asset-checks.ts
packages/pt-runtime/src/build/index.ts
packages/pt-runtime/src/build/main-generator.ts
packages/pt-runtime/src/build/main-manifest.ts
packages/pt-runtime/src/build/manifest.ts
packages/pt-runtime/src/build/pt-safe-build-gate.ts
packages/pt-runtime/src/build/pt-safe-cli.ts
packages/pt-runtime/src/build/render-catalog.ts
packages/pt-runtime/src/build/render-from-handlers.ts
packages/pt-runtime/src/build/render-main-v2.ts
packages/pt-runtime/src/build/render-runtime-modular.ts
packages/pt-runtime/src/build/render-runtime-v2.ts
packages/pt-runtime/src/build/runtime-build-info.ts
packages/pt-runtime/src/build/runtime-generator.ts
packages/pt-runtime/src/build/runtime-manifest.ts
packages/pt-runtime/src/build/runtime-module-manifest.ts
packages/pt-runtime/src/build/snapshot-validator.ts
packages/pt-runtime/src/build/syntax-preflight.ts
packages/pt-runtime/src/build/templates/entry-points.ts
packages/pt-runtime/src/build/templates/file-loader.ts
packages/pt-runtime/src/build/templates/index.ts
packages/pt-runtime/src/build/templates/kernel-iife.ts
packages/pt-runtime/src/build/templates/module-wrapper.ts
packages/pt-runtime/src/build/templates/runtime-loader.ts
packages/pt-runtime/src/build/validate-pt-api.ts
packages/pt-runtime/src/build/validate-pt-safe.ts
packages/pt-runtime/src/build/validation.ts
packages/pt-runtime/src/cli.ts
packages/pt-runtime/src/compat/__tests__/es5-validator.test.ts
packages/pt-runtime/src/compat/__tests__/pt-safe-validator.test.ts
packages/pt-runtime/src/compat/es5-validator.ts
packages/pt-runtime/src/compat/index.ts
packages/pt-runtime/src/compat/pt-safe-validator.ts
packages/pt-runtime/src/contracts/pt-compatibility.test.ts
packages/pt-runtime/src/contracts/pt-compatibility.ts
packages/pt-runtime/src/core/built-in-middleware.ts
packages/pt-runtime/src/core/dispatcher.ts
packages/pt-runtime/src/core/index.ts
packages/pt-runtime/src/core/middleware.ts
packages/pt-runtime/src/core/plugin-api.ts
packages/pt-runtime/src/core/registry.ts
packages/pt-runtime/src/core/runtime-builder.ts
packages/pt-runtime/src/domain/contracts.ts
packages/pt-runtime/src/domain/deferred-job-plan.ts
packages/pt-runtime/src/domain/errors.ts
packages/pt-runtime/src/domain/index.ts
packages/pt-runtime/src/domain/ios-plans.ts
packages/pt-runtime/src/domain/link-merge.ts
packages/pt-runtime/src/domain/link-registry.ts
packages/pt-runtime/src/domain/link-types.ts
packages/pt-runtime/src/domain/live-link.ts
packages/pt-runtime/src/domain/port-owner-index.ts
packages/pt-runtime/src/domain/pt-link-collector.ts
packages/pt-runtime/src/domain/runtime-result.ts
packages/pt-runtime/src/fase-7-runtime.test.ts
packages/pt-runtime/src/handlers/LIMITATIONS.md
packages/pt-runtime/src/handlers/add-link.ts
packages/pt-runtime/src/handlers/cable-recommender.ts
packages/pt-runtime/src/handlers/canvas.ts
packages/pt-runtime/src/handlers/deep-inspect.ts
packages/pt-runtime/src/handlers/device-classifier.ts
packages/pt-runtime/src/handlers/device-config.ts
packages/pt-runtime/src/handlers/device-crud.ts
packages/pt-runtime/src/handlers/device-discovery.ts
packages/pt-runtime/src/handlers/device-listing.ts
packages/pt-runtime/src/handlers/device.ts
packages/pt-runtime/src/handlers/dhcp.ts
packages/pt-runtime/src/handlers/dispatcher.ts
packages/pt-runtime/src/handlers/evaluate.ts
packages/pt-runtime/src/handlers/handler-registry.ts
packages/pt-runtime/src/handlers/host-handler.ts
packages/pt-runtime/src/handlers/host.ts
packages/pt-runtime/src/handlers/index.ts
packages/pt-runtime/src/handlers/inspect.ts
packages/pt-runtime/src/handlers/ios-engine.ts
packages/pt-runtime/src/handlers/ios-execution.ts
packages/pt-runtime/src/handlers/ios-output-classifier.ts
packages/pt-runtime/src/handlers/ios-payloads.ts
packages/pt-runtime/src/handlers/ios-plan-builder.ts
packages/pt-runtime/src/handlers/ios-session.ts
packages/pt-runtime/src/handlers/ios/config-ios-handler.ts
packages/pt-runtime/src/handlers/ios/deferred-poll-handler.ts
packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts
packages/pt-runtime/src/handlers/ios/host-stabilize.ts
packages/pt-runtime/src/handlers/ios/index.ts
packages/pt-runtime/src/handlers/ios/ios-result-mapper.ts
packages/pt-runtime/src/handlers/ios/ios-session-utils.ts
packages/pt-runtime/src/handlers/ios/ping-handler.ts
packages/pt-runtime/src/handlers/ios/read-terminal-handler.ts
packages/pt-runtime/src/handlers/link-types.ts
packages/pt-runtime/src/handlers/link.ts
packages/pt-runtime/src/handlers/list-links.ts
packages/pt-runtime/src/handlers/module/constants.ts
packages/pt-runtime/src/handlers/module/handlers.ts
packages/pt-runtime/src/handlers/module/helpers.ts
packages/pt-runtime/src/handlers/module/index.ts
packages/pt-runtime/src/handlers/module/slot-finder.ts
packages/pt-runtime/src/handlers/module/types.ts
packages/pt-runtime/src/handlers/omniscience-environment.ts
packages/pt-runtime/src/handlers/omniscience-logical.ts
packages/pt-runtime/src/handlers/omniscience-physical.ts
packages/pt-runtime/src/handlers/omniscience-telepathy.ts
packages/pt-runtime/src/handlers/omniscience-utils.ts
packages/pt-runtime/src/handlers/parsers/ios-parsers.ts
packages/pt-runtime/src/handlers/poll-deferred.ts
packages/pt-runtime/src/handlers/registration/README.md
packages/pt-runtime/src/handlers/registration/experimental-handlers.ts
packages/pt-runtime/src/handlers/registration/omni-handlers.ts
packages/pt-runtime/src/handlers/registration/runtime-registration.ts
packages/pt-runtime/src/handlers/registration/stable-handlers.ts
packages/pt-runtime/src/handlers/remove-link.ts
packages/pt-runtime/src/handlers/result-factories.ts
packages/pt-runtime/src/handlers/runtime-handlers.ts
packages/pt-runtime/src/handlers/terminal-plan-run.ts
packages/pt-runtime/src/handlers/terminal-sanitizer.ts
packages/pt-runtime/src/handlers/verify-link.ts
packages/pt-runtime/src/handlers/vlan.ts
packages/pt-runtime/src/harness/pt-script-result/parser.ts
packages/pt-runtime/src/index.ts
packages/pt-runtime/src/kernel/__tests__/bootstrap.test.ts
packages/pt-runtime/src/kernel/__tests__/cleanup-manager.test.ts
packages/pt-runtime/src/kernel/__tests__/dispatch-loop.test.ts
packages/pt-runtime/src/kernel/__tests__/runtime-loader.test.ts
packages/pt-runtime/src/kernel/__tests__/runtime-state.test.ts
packages/pt-runtime/src/kernel/bootstrap.ts
packages/pt-runtime/src/kernel/cleanup-manager.ts
packages/pt-runtime/src/kernel/dispatch-loop.ts
packages/pt-runtime/src/kernel/index.ts
packages/pt-runtime/src/kernel/runtime-loader.ts
packages/pt-runtime/src/kernel/runtime-state.ts
packages/pt-runtime/src/omni/index.ts
packages/pt-runtime/src/omni/omni-registry.ts
packages/pt-runtime/src/ports.ts
packages/pt-runtime/src/primitives/device/index.ts
packages/pt-runtime/src/primitives/host/index.ts
packages/pt-runtime/src/primitives/index.ts
packages/pt-runtime/src/primitives/link/index.ts
packages/pt-runtime/src/primitives/module/index.ts
packages/pt-runtime/src/primitives/primitive-registry.ts
packages/pt-runtime/src/primitives/snapshot/index.ts
packages/pt-runtime/src/pt-api/index.ts
packages/pt-runtime/src/pt-api/pt-api-registry.ts
packages/pt-runtime/src/pt-api/pt-call-inventory.ts
packages/pt-runtime/src/pt-api/pt-constants.ts
packages/pt-runtime/src/pt-api/pt-deps.ts
packages/pt-runtime/src/pt-api/pt-events.ts
packages/pt-runtime/src/pt-api/pt-helpers.ts
packages/pt-runtime/src/pt-api/pt-processes.ts
packages/pt-runtime/src/pt-api/pt-results.ts
packages/pt-runtime/src/pt-api/pt-types.ts
packages/pt-runtime/src/pt-api/registry/activity-api.ts
packages/pt-runtime/src/pt-api/registry/all-types.ts
packages/pt-runtime/src/pt-api/registry/cli-api.ts
packages/pt-runtime/src/pt-api/registry/device-api.ts
packages/pt-runtime/src/pt-api/registry/file-manager-api.ts
packages/pt-runtime/src/pt-api/registry/globals.ts
packages/pt-runtime/src/pt-api/registry/index.ts
packages/pt-runtime/src/pt-api/registry/ipc-base.ts
packages/pt-runtime/src/pt-api/registry/link-api.ts
packages/pt-runtime/src/pt-api/registry/metadata.ts
packages/pt-runtime/src/pt-api/registry/module-api.ts
packages/pt-runtime/src/pt-api/registry/network-api.ts
packages/pt-runtime/src/pt-api/registry/port-api.ts
packages/pt-runtime/src/pt-api/registry/server-api.ts
packages/pt-runtime/src/pt-api/registry/simulation-api.ts
packages/pt-runtime/src/pt-api/registry/workspace-api.ts
packages/pt-runtime/src/pt-api/template-audit.md
packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts
packages/pt-runtime/src/pt/kernel/cleanup.ts
packages/pt-runtime/src/pt/kernel/command-finalizer.ts
packages/pt-runtime/src/pt/kernel/command-queue.ts
packages/pt-runtime/src/pt/kernel/command-result-envelope.ts
packages/pt-runtime/src/pt/kernel/dead-letter.ts
packages/pt-runtime/src/pt/kernel/debug-log.ts
packages/pt-runtime/src/pt/kernel/directories.ts
packages/pt-runtime/src/pt/kernel/execution-engine.ts
packages/pt-runtime/src/pt/kernel/file-access.ts
packages/pt-runtime/src/pt/kernel/heartbeat.ts
packages/pt-runtime/src/pt/kernel/index.ts
packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts
packages/pt-runtime/src/pt/kernel/kernel-state.ts
packages/pt-runtime/src/pt/kernel/lease.ts
packages/pt-runtime/src/pt/kernel/main.ts
packages/pt-runtime/src/pt/kernel/pt-globals.d.ts
packages/pt-runtime/src/pt/kernel/queue-claim.ts
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts
packages/pt-runtime/src/pt/kernel/queue-discovery.ts
packages/pt-runtime/src/pt/kernel/queue-index.ts
packages/pt-runtime/src/pt/kernel/queue-poller.ts
packages/pt-runtime/src/pt/kernel/runtime-api.ts
packages/pt-runtime/src/pt/kernel/runtime-loader.ts
packages/pt-runtime/src/pt/kernel/safe-fm.ts
packages/pt-runtime/src/pt/kernel/types.ts
packages/pt-runtime/src/pt/terminal/index.ts
packages/pt-runtime/src/pt/terminal/prompt-parser.ts
packages/pt-runtime/src/pt/terminal/terminal-engine.ts
packages/pt-runtime/src/pt/terminal/terminal-events.ts
packages/pt-runtime/src/pt/terminal/terminal-session.ts
packages/pt-runtime/src/ptbuilder-spec.ts
packages/pt-runtime/src/runtime-artifacts.ts
packages/pt-runtime/src/runtime-validator.ts
packages/pt-runtime/src/runtime/constants.ts
packages/pt-runtime/src/runtime/contracts.ts
packages/pt-runtime/src/runtime/helpers.ts
packages/pt-runtime/src/runtime/index.ts
packages/pt-runtime/src/runtime/logger.ts
packages/pt-runtime/src/runtime/metrics.ts
packages/pt-runtime/src/runtime/payload-validator.ts
packages/pt-runtime/src/runtime/pt-version.ts
packages/pt-runtime/src/runtime/sanitizers.ts
packages/pt-runtime/src/runtime/security.ts
packages/pt-runtime/src/runtime/types.ts
packages/pt-runtime/src/runtime/validators/add-device.ts
packages/pt-runtime/src/runtime/validators/config-dhcp.ts
packages/pt-runtime/src/runtime/validators/config-host.ts
packages/pt-runtime/src/runtime/validators/device-ops.ts
packages/pt-runtime/src/runtime/validators/ios.ts
packages/pt-runtime/src/runtime/validators/link.ts
packages/pt-runtime/src/scripts/generate-model-map.ts
packages/pt-runtime/src/system/__tests__/paths.test.ts
packages/pt-runtime/src/system/paths.ts
packages/pt-runtime/src/templates/generated-module-map.ts
packages/pt-runtime/src/terminal/command-executor.ts
packages/pt-runtime/src/terminal/command-output-extractor.test.ts
packages/pt-runtime/src/terminal/command-output-extractor.ts
packages/pt-runtime/src/terminal/command-sanitizer.ts
packages/pt-runtime/src/terminal/confirm-handler.ts
packages/pt-runtime/src/terminal/engine/command-executor.ts
packages/pt-runtime/src/terminal/engine/command-state-machine.ts
packages/pt-runtime/src/terminal/engine/index.ts
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts
packages/pt-runtime/src/terminal/engine/terminal-event-collector.ts
packages/pt-runtime/src/terminal/engine/terminal-observability.ts
packages/pt-runtime/src/terminal/engine/terminal-output-pipeline.ts
packages/pt-runtime/src/terminal/engine/terminal-recovery-controller.ts
packages/pt-runtime/src/terminal/index.ts
packages/pt-runtime/src/terminal/ios-evidence.ts
packages/pt-runtime/src/terminal/mode-guard.ts
packages/pt-runtime/src/terminal/pager-handler.ts
packages/pt-runtime/src/terminal/plan-engine.ts
packages/pt-runtime/src/terminal/prompt-detector.ts
packages/pt-runtime/src/terminal/session-registry.ts
packages/pt-runtime/src/terminal/session-state.ts
packages/pt-runtime/src/terminal/stability-heuristic.ts
packages/pt-runtime/src/terminal/standard-plans.ts
packages/pt-runtime/src/terminal/terminal-errors.ts
packages/pt-runtime/src/terminal/terminal-execution-result.ts
packages/pt-runtime/src/terminal/terminal-plan.ts
packages/pt-runtime/src/terminal/terminal-ready.ts
packages/pt-runtime/src/terminal/terminal-recovery.ts
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts
packages/pt-runtime/src/terminal/terminal-utils.ts
packages/pt-runtime/src/utils/constants.ts
packages/pt-runtime/src/utils/device-creation.ts
packages/pt-runtime/src/utils/device-utils.ts
packages/pt-runtime/src/utils/device-xml-parser.ts
packages/pt-runtime/src/utils/handler-types.ts
packages/pt-runtime/src/utils/helpers.ts
packages/pt-runtime/src/utils/index.ts
packages/pt-runtime/src/utils/parser-generator.ts
packages/pt-runtime/src/utils/port-utils.ts
packages/pt-runtime/src/value-objects/cable-type.ts
packages/pt-runtime/src/value-objects/device-name.ts
packages/pt-runtime/src/value-objects/hardware-maps.ts
packages/pt-runtime/src/value-objects/index.ts
packages/pt-runtime/src/value-objects/interface-name.ts
packages/pt-runtime/src/value-objects/session-mode.ts
packages/pt-runtime/src/value-objects/validated-models.ts
packages/pt-runtime/src/verified-models.ts
```


## packages/pt-runtime/src/cli.ts
```ts
// ============================================================================
// PT Runtime - CLI Entry Point
// ============================================================================
// bun run src/cli.ts <command>
// Comandos: generate, deploy, modular

import * as path from "path";
import { RuntimeGenerator } from "./build/runtime-generator.js";
import { ModularRuntimeGenerator } from "./build/render-runtime-modular.js";
import { getDefaultDevDir } from "./system/paths.js";

const args = Bun.argv.slice(2);
const command = args[0] ?? "help";

async function main() {
  switch (command) {
    case "generate": {
      const generator = new RuntimeGenerator({
        outputDir: path.join(path.resolve(__dirname), "../dist-qtscript"),
        devDir: getDefaultDevDir(),
      });
      await generator.generate();
      console.log("Generated: dist-qtscript/");
      break;
    }

    case "deploy": {
      const generator = new RuntimeGenerator({
        outputDir: path.join(path.resolve(__dirname), "../dist-qtscript"),
        devDir: getDefaultDevDir(),
      });
      await generator.deploy();
      console.log("Deployed to: " + generator.config.devDir);
      break;
    }

    case "modular": {
      const generator = new ModularRuntimeGenerator({
        outputDir: path.join(path.resolve(__dirname), "../dist-modular"),
        devDir: getDefaultDevDir(),
        splitModules: true,
      });
      const { modules, manifest } = await generator.generate();
      console.log("✅ Modular generation complete!");
      console.log(`   Modules: ${modules.size}`);
      console.log(`   Path: ${path.join(path.resolve(__dirname), "../dist-modular")}`);
      console.log(`   Manifest: ${JSON.stringify(manifest.modulePaths)}`);
      break;
    }

    case "help":
    default: {
      console.log("Usage: bun run src/cli.ts <command>");
      console.log("Commands:");
      console.log("  generate  - Generate runtime artifacts to dist-qtscript/");
      console.log("  deploy    - Generate and deploy to PT dev directory");
      console.log("  modular   - Generate modular runtime with hot-reload");
      break;
    }
  }
}

main().catch((e: unknown) => {
  console.error("Error:", e);
  process.exit(1);
});
```

## grep generator
```
packages/pt-runtime/src/runtime-artifacts.ts:24:  const files = ['main.js', 'runtime.js', 'manifest.json', 'bridge-lease.json'];
packages/pt-runtime/src/runtime-artifacts.ts:53:  const files = ['main.js', 'runtime.js', 'manifest.json', 'bridge-lease.json'];
packages/pt-runtime/src/core/registry.ts:5: * @deprecated Not used by the compiled runtime.js output.
packages/pt-runtime/src/core/registry.ts:7: * This registry is retained for future extensibility or alternative build paths.
packages/pt-runtime/src/core/runtime-builder.ts:1:// packages/pt-runtime/src/core/runtime-builder.ts
packages/pt-runtime/src/core/runtime-builder.ts:2:// Runtime builder - assembles runtime from handlers or templates
packages/pt-runtime/src/core/runtime-builder.ts:4:import { renderRuntimeV2Sync } from "../build/render-runtime-v2";
packages/pt-runtime/src/core/runtime-builder.ts:5:import { renderMainV2 } from "../build/render-main-v2";
packages/pt-runtime/src/core/runtime-builder.ts:17:  buildRuntimeFromHandlers(inputDir: string): string {
packages/pt-runtime/src/core/runtime-builder.ts:24:  buildMainKernel(devDir?: string): string {
packages/pt-runtime/src/core/runtime-builder.ts:32:  buildAll(inputDir: string, devDir?: string): RuntimeBuildResult {
packages/pt-runtime/src/core/runtime-builder.ts:34:      main: this.buildMainKernel(devDir),
packages/pt-runtime/src/core/runtime-builder.ts:35:      runtime: this.buildRuntimeFromHandlers(inputDir),
packages/pt-runtime/src/core/index.ts:3:export * from "./runtime-builder";
packages/pt-runtime/src/core/dispatcher.ts:2: * @legacy RuntimeDispatcher — not used in the compiled runtime.js build path.
packages/pt-runtime/src/core/dispatcher.ts:4: * The ACTIVE dispatcher compiled into runtime.js is `runtimeDispatcher()` in
packages/pt-runtime/src/core/dispatcher.ts:8: * for extensibility but is currently disconnected from the AST build pipeline.
packages/pt-runtime/src/fase-7-runtime.test.ts:8:  test("generate, validate, deploy y build funcionan con semántica separada", async () => {
packages/pt-runtime/src/fase-7-runtime.test.ts:17:    expect(existsSync(join(outputDir, "main.js"))).toBe(true);
packages/pt-runtime/src/fase-7-runtime.test.ts:18:    expect(existsSync(join(outputDir, "runtime.js"))).toBe(true);
packages/pt-runtime/src/fase-7-runtime.test.ts:23:    expect(existsSync(join(devDir, "main.js"))).toBe(true);
packages/pt-runtime/src/fase-7-runtime.test.ts:24:    expect(existsSync(join(devDir, "runtime.js"))).toBe(true);
packages/pt-runtime/src/fase-7-runtime.test.ts:27:    await generator.build();
packages/pt-runtime/src/fase-7-runtime.test.ts:43:    const buildReport = await generator.build();
packages/pt-runtime/src/fase-7-runtime.test.ts:44:    const manifest = buildReport.manifest;
packages/pt-runtime/src/verified-models.ts:4: * Esta capa se apoya en `ptbuilder-spec.ts`, que contiene el mapa oficial
packages/pt-runtime/src/verified-models.ts:8:import { allDeviceTypes, getPTDeviceType } from './ptbuilder-spec';
packages/pt-runtime/src/runtime/contracts.ts:5:// These contracts define the boundary between main.js (kernel) and runtime.js (logic).
packages/pt-runtime/src/runtime/index.ts:4: * This is the main runtime function called from PT main.js
packages/pt-runtime/src/runtime/index.ts:97: * @param api - RuntimeApi object injected by main.js kernel
packages/pt-runtime/src/cli.ts:8:import { RuntimeGenerator } from "./build/runtime-generator.js";
packages/pt-runtime/src/cli.ts:9:import { ModularRuntimeGenerator } from "./build/render-runtime-modular.js";
packages/pt-runtime/src/cli.ts:19:        outputDir: path.join(path.resolve(__dirname), "../dist-qtscript"),
packages/pt-runtime/src/cli.ts:23:      console.log("Generated: dist-qtscript/");
packages/pt-runtime/src/cli.ts:29:        outputDir: path.join(path.resolve(__dirname), "../dist-qtscript"),
packages/pt-runtime/src/cli.ts:55:      console.log("  generate  - Generate runtime artifacts to dist-qtscript/");
packages/pt-runtime/src/terminal/ios-evidence.ts:36:export function buildEvidence(
packages/pt-runtime/src/terminal/standard-plans.ts:185:export function buildIosBootstrapPlan(deviceName: string) {
packages/pt-runtime/src/terminal/index.ts:134:  buildEvidence,
packages/pt-runtime/src/terminal/engine/terminal-output-pipeline.ts:37:export function buildFinalOutput(input: {
packages/pt-runtime/src/terminal/engine/command-executor.ts:45:  buildFinalOutput,
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:42:  buildFinalOutput,
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:379:          resolve(this.buildResult());
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:392:  private buildResult(): CommandExecutionResult {
packages/pt-runtime/src/terminal/engine/index.ts:42:  buildFinalOutput,
packages/pt-runtime/src/README.md:67:cp ../generated/runtime.js /Users/andresgaibor/pt-dev/runtime.js
packages/pt-runtime/src/pt-api/registry/globals.ts:199: * Used as file-access fallback when ipc.systemFileManager() is unavailable (main.js context quirk).
packages/pt-runtime/src/pt/kernel/safe-fm.ts:70:      return makeSafeFM(buildScriptModuleShim(), "copy-delete");
packages/pt-runtime/src/pt/kernel/safe-fm.ts:107:function buildScriptModuleShim(): any {
packages/pt-runtime/src/pt/kernel/main.ts:71:  const runtimeLoader = createRuntimeLoader({ runtimeFile: config.devDir + "/runtime.js" });
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:2:// Hot reload for runtime.js with safe reload
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:8:// If runtime.js changes while work is in progress, reload is deferred
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:36:      dprint("[loader] runtime.js not found at " + config.runtimeFile);
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:58:      visibleLog("[loader] Loading runtime.js...", "info");
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:135:        throw new Error("runtime.js did not register _ptDispatch — check for init errors");
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:147:      visibleLog("[loader] SUCCESS: runtime.js loaded (mtime=" + mtime + ")", "info");
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:245:    dprint("[runtime-loader] Reloading runtime.js...");
packages/pt-runtime/src/pt/kernel/queue-claim.ts:8:// debe hacerse por build-time replacement o constante PT-safe.
packages/pt-runtime/src/pt/kernel/pt-globals.d.ts:41:// Used as fallback when ipc.systemFileManager() is unavailable (e.g. main.js context).
packages/pt-runtime/src/pt/kernel/command-finalizer.ts:8:import { buildCommandResultEnvelope } from "./command-result-envelope";
packages/pt-runtime/src/pt/kernel/command-finalizer.ts:24:    const envelope = buildCommandResultEnvelope(state.activeCommand, result);
packages/pt-runtime/src/pt/kernel/queue-index.ts:12:  rebuildFromFiles(files: string[]): void;
packages/pt-runtime/src/pt/kernel/queue-index.ts:112:  function rebuildFromFiles(files: string[]): void {
packages/pt-runtime/src/pt/kernel/queue-index.ts:117:      dprint("[queue-index] rebuild error: " + String(e));
packages/pt-runtime/src/pt/kernel/queue-index.ts:121:  return { read, remove, add, rebuildFromFiles };
packages/pt-runtime/src/pt/kernel/command-result-envelope.ts:6:export function buildCommandResultEnvelope(
packages/pt-runtime/src/__tests__/queue-claim.test.ts:18:function buildFm() {
packages/pt-runtime/src/__tests__/queue-claim.test.ts:67:    (globalThis as any).fm = buildFm();
packages/pt-runtime/src/__tests__/validate-pt-api.test.ts:2:import { validatePtApiCalls } from "../build/validate-pt-api.js";
packages/pt-runtime/src/__tests__/pt/kernel/command-finalizer.test.ts:3:import { buildCommandResultEnvelope } from "../../../pt/kernel/command-result-envelope";
packages/pt-runtime/src/__tests__/pt/kernel/command-finalizer.test.ts:5:describe("buildCommandResultEnvelope", () => {
packages/pt-runtime/src/__tests__/pt/kernel/command-finalizer.test.ts:7:    const envelope = buildCommandResultEnvelope(
packages/pt-runtime/src/__tests__/pt/kernel/command-finalizer.test.ts:29:    const envelope = buildCommandResultEnvelope(
packages/pt-runtime/src/__tests__/build/manifest-dependency-validator.test.ts:3:import { getAllRuntimeFiles, validateRuntimeManifestDependencies } from "../../build/runtime-manifest";
packages/pt-runtime/src/__tests__/build/manifest-dependency-validator.test.ts:4:import { validateMainManifestDependencies } from "../../build/main-manifest";
packages/pt-runtime/src/__tests__/build/runtime-generator-report.test.ts:8:describe("RuntimeGenerator build report", () => {
packages/pt-runtime/src/__tests__/build/runtime-generator-report.test.ts:17:      const first = await generator.build();
packages/pt-runtime/src/__tests__/build/runtime-generator-report.test.ts:21:      const second = await generator.build();
packages/pt-runtime/src/__tests__/build/preflight-validation.test.ts:2:import { validateBalancedSyntax } from "../../build/syntax-preflight.js";
packages/pt-runtime/src/__tests__/build/render-main-v2.test.ts:3:import { renderMainV2 } from "../../build/render-main-v2";
packages/pt-runtime/src/__tests__/build/runtime-manifest-order.test.ts:2:import { getAllRuntimeFiles } from "../../build/runtime-manifest";
packages/pt-runtime/src/__tests__/build/ast-transform.test.ts:2:import { transformToPtSafeAst } from "../../build/ast-transform";
packages/pt-runtime/src/__tests__/build/main-runtime-contract.test.ts:2:import { renderMainV2, renderRuntimeV2Sync } from "../../build";
packages/pt-runtime/src/__tests__/build/main-runtime-contract.test.ts:3:import { getAllMainFiles } from "../../build/main-manifest";
packages/pt-runtime/src/__tests__/build/main-runtime-contract.test.ts:6:  test("main.js solo bootstrappea el kernel", () => {
packages/pt-runtime/src/__tests__/build/main-runtime-contract.test.ts:7:    const main = renderMainV2({ srcDir: "src", outputPath: "/tmp/main.js", injectDevDir: "/tmp/pt-dev" });
packages/pt-runtime/src/__tests__/build/main-runtime-contract.test.ts:22:  test("runtime.js publica _ptDispatch y runtimeDispatcher", () => {
packages/pt-runtime/src/__tests__/build/main-runtime-contract.test.ts:23:    const runtime = renderRuntimeV2Sync({ srcDir: "src", outputPath: "/tmp/runtime.js", injectDevDir: "/tmp/pt-dev" });
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:3:import { renderMainV2 } from "../../build/render-main-v2";
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:5:describe("generated main.js symbols", () => {
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:6:  test("define buildCommandResultEnvelope when referenced", () => {
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:13:    const references = source.includes("buildCommandResultEnvelope");
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:15:      source.includes("function buildCommandResultEnvelope") ||
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:16:      source.includes("var buildCommandResultEnvelope") ||
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:17:      source.includes("const buildCommandResultEnvelope");
packages/pt-runtime/src/__tests__/build/main-manifest-order.test.ts:2:import { getAllMainFiles, validateMainManifestDependencies } from "../../build/main-manifest";
packages/pt-runtime/src/__tests__/domain/deferred-job-plan.test.ts:36:describe("step builders", () => {
packages/pt-runtime/src/__tests__/device-handler.test.ts:316:    test("builds symmetric connectionsByDevice from links[]", () => {
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:21:function buildFm() {
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:70:    (globalThis as any).fm = buildFm();
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:123:    (globalThis as any).fm = buildFm();
packages/pt-runtime/src/ports.ts:7: * Note: These ports are NOT used by the compiled runtime.js build path.
packages/pt-runtime/src/ports.ts:10: * and alternative build paths.
packages/pt-runtime/src/ports.ts:12: * @deprecated Not used in active build path. See handlers/runtime-handlers.ts.
packages/pt-runtime/src/templates/generated-module-map.ts:4:// Source: ptbuilder-spec.ts + pt-runtime module handlers
packages/pt-runtime/src/runtime-validator.ts:9:// - main.js debe exponer símbolos mínimos del bootloader/kernel
packages/pt-runtime/src/runtime-validator.ts:10:// - runtime.js debe exponer símbolos mínimos del dispatcher runtime
packages/pt-runtime/src/runtime-validator.ts:95:        pushUnique(errors, `Missing required main.js symbol: ${symbol}`);
packages/pt-runtime/src/runtime-validator.ts:103:        "main.js does not appear to expose the queue directories for the queue-based protocol",
packages/pt-runtime/src/runtime-validator.ts:111:        pushUnique(errors, `Missing required runtime.js symbol: ${symbol}`);
packages/pt-runtime/src/index.ts:42:  buildEvidence,
packages/pt-runtime/src/index.ts:139:} from "./build/index.js";
packages/pt-runtime/src/index.ts:145:} from "./build/manifest.js";
packages/pt-runtime/src/build/ast-transforms/index.ts:1:// packages/pt-runtime/src/build/ast-transforms/index.ts
packages/pt-runtime/src/build/validation.ts:32:      errors.push(`main.js syntax: ${mainSyntax.errors.length} error(s)`);
packages/pt-runtime/src/build/validation.ts:33:      console.error("main.js syntax errors:", JSON.stringify(mainSyntax.errors, null, 2));
packages/pt-runtime/src/build/validation.ts:39:      errors.push(`runtime.js syntax: ${runtimeSyntax.errors.length} error(s)`);
packages/pt-runtime/src/build/validation.ts:40:      console.error("runtime.js syntax errors:", JSON.stringify(runtimeSyntax.errors, null, 2));
packages/pt-runtime/src/build/validation.ts:43:      errors.push(`main.js contract: ${mainContract.errors.length} error(s)`);
packages/pt-runtime/src/build/validation.ts:46:      errors.push(`runtime.js contract: ${runtimeContract.errors.length} error(s)`);
packages/pt-runtime/src/build/validation.ts:49:      console.warn("main.js PT-safe issues:", JSON.stringify(mainValidation.errors, null, 2));
packages/pt-runtime/src/build/validation.ts:55:      console.warn("runtime.js PT-safe issues:", JSON.stringify(runtimeValidation.errors, null, 2));
packages/pt-runtime/src/build/validation.ts:58:      console.warn("main.js ES5 issues:", JSON.stringify(mainEs5.errors, null, 2));
packages/pt-runtime/src/build/validation.ts:61:      console.warn("runtime.js ES5 issues:", JSON.stringify(runtimeEs5.errors, null, 2));
packages/pt-runtime/src/build/validation.ts:64:      console.warn("main.js PT-safe compat issues:", JSON.stringify(mainCompat.errors, null, 2));
packages/pt-runtime/src/build/validation.ts:70:      console.warn("runtime.js PT-safe compat issues:", JSON.stringify(runtimeCompat.errors, null, 2));
packages/pt-runtime/src/build/main-manifest.ts:1:// packages/pt-runtime/src/build/main-manifest.ts
packages/pt-runtime/src/build/main-manifest.ts:3:// Usado por render-main-v2.ts para generar main.js
packages/pt-runtime/src/build/main-manifest.ts:10:  description: "Lista de archivos TypeScript para generar main.js (kernel + terminal)",
packages/pt-runtime/src/build/runtime-generator.ts:30:    const buildId = Date.now().toString();
packages/pt-runtime/src/build/runtime-generator.ts:35:    }).replace('runtime.js', 'runtime.js?v=' + buildId);
packages/pt-runtime/src/build/runtime-generator.ts:59:    await fs.promises.writeFile(path.join(outDir, "main.js"), main, "utf-8");
packages/pt-runtime/src/build/runtime-generator.ts:61:    await fs.promises.writeFile(path.join(outDir, "runtime.js"), runtime, "utf-8");
packages/pt-runtime/src/build/runtime-generator.ts:81:    await fs.promises.writeFile(path.join(this.config.devDir, "main.js"), main, "utf-8");
packages/pt-runtime/src/build/runtime-generator.ts:83:    await fs.promises.writeFile(path.join(this.config.devDir, "runtime.js"), runtime, "utf-8");
packages/pt-runtime/src/build/runtime-generator.ts:87:  async build(): Promise<RuntimeBuildReport> {
packages/pt-runtime/src/build/runtime-generator.ts:98:    await fs.promises.writeFile(path.join(outDir, "main.js"), main, "utf-8");
packages/pt-runtime/src/build/runtime-generator.ts:100:    await fs.promises.writeFile(path.join(outDir, "runtime.js"), runtime, "utf-8");
packages/pt-runtime/src/build/runtime-build-info.ts:1:// Runtime Build Info - Metadata inyectado en runtime.js durante deploy
packages/pt-runtime/src/build/ast-transform.ts:1:// packages/pt-runtime/src/build/ast-transform.ts
packages/pt-runtime/src/build/ast-transform.ts:226:  const graph = buildDependencyGraph(sourceFiles);
packages/pt-runtime/src/build/ast-transform.ts:229:  const entryPoints = ["handlers/runtime-handlers.ts"];
packages/pt-runtime/src/build/ast-transform.ts:230:  const queue: string[] = [...entryPoints];
packages/pt-runtime/src/build/ast-transform.ts:248:function buildDependencyGraph(sourceFiles: Map<string, string>): DependencyGraph {
packages/pt-runtime/src/build/validate-pt-safe.ts:1:// packages/pt-runtime/src/build/validate-pt-safe.ts
packages/pt-runtime/src/build/validate-pt-safe.ts:35:  bundleSize: number,
packages/pt-runtime/src/build/validate-pt-safe.ts:46:      bundleSize,
packages/pt-runtime/src/build/validate-pt-safe.ts:47:      estimatedSourceMapsSize: Math.ceil(bundleSize * 0.1),
packages/pt-runtime/src/build/validate-pt-safe.ts:56:  bundleSize: number;
packages/pt-runtime/src/build/validate-pt-safe.ts:103:    suggestion: "Remove export keyword - code is bundled inline",
packages/pt-runtime/src/build/validate-pt-safe.ts:115:    suggestion: "Use static imports at build time",
packages/pt-runtime/src/build/validate-pt-safe.ts:130:    suggestion: "Use environment variables injected at build time instead of process.env",
packages/pt-runtime/src/build/validate-pt-safe.ts:299:  parts.push(`Bundle size: ${result.summary.bundleSize.toLocaleString()} chars`);
packages/pt-runtime/src/build/pt-safe-cli.ts:4:import { checkFilesForPTSafety, formatBuildGateResult, type PtSafeCheckResult, type FileContent } from "./pt-safe-build-gate.js";
packages/pt-runtime/src/build/render-main-v2.ts:1:// packages/pt-runtime/src/build/render-main-v2.ts
packages/pt-runtime/src/build/render-main-v2.ts:2:// Genera main.js — el bootloader de PT Script Module.
packages/pt-runtime/src/build/render-main-v2.ts:4:// Responsabilidades de main.js (SOLO estas):
packages/pt-runtime/src/build/render-main-v2.ts:10:// runtime.js se carga desde disco y se recarga automáticamente cuando cambia.
packages/pt-runtime/src/build/render-main-v2.ts:12:// NOTE: NO hay modo embedded. main.js siempre carga desde archivos en disco.
packages/pt-runtime/src/build/render-main-v2.ts:20:import { tslibHelpersTemplate, kernelIifeTemplate, fileLoaderTemplate, entryPointsTemplate } from "./templates/index.js";
packages/pt-runtime/src/build/render-main-v2.ts:49:      `[render-main-v2] BUILD FAILED: main.js manifest is missing ${missingDependencies.length} transitive dependenc${missingDependencies.length === 1 ? "y" : "ies"}.\n` +
packages/pt-runtime/src/build/render-main-v2.ts:51:        `Add them to the appropriate section in packages/pt-runtime/src/build/main-manifest.ts:\n` +
packages/pt-runtime/src/build/render-main-v2.ts:71:    console.warn("[render-main-v2] PT-safe validation warnings ignored for build continuity.");
packages/pt-runtime/src/build/render-main-v2.ts:89:  const buildTimestamp = new Date().toISOString();
packages/pt-runtime/src/build/render-main-v2.ts:105:  const entryPoints = entryPointsTemplate({
packages/pt-runtime/src/build/render-main-v2.ts:107:    buildTimestamp,
packages/pt-runtime/src/build/render-main-v2.ts:111:// Do not edit directly — regenerate with: bun run pt:build
packages/pt-runtime/src/build/render-main-v2.ts:112:// Generated at: ${buildTimestamp}
packages/pt-runtime/src/build/render-main-v2.ts:113:// Build ID: ${buildTimestamp.replace(/[:.]/g, "-")}
packages/pt-runtime/src/build/render-main-v2.ts:116://   main.js    = kernel IIFE + file loader (this file)
packages/pt-runtime/src/build/render-main-v2.ts:118://   runtime.js = all handlers + dispatcher (hot-reloaded by kernel)
packages/pt-runtime/src/build/render-main-v2.ts:123:  const output = header + kernelIife + fileLoader + entryPoints;
packages/pt-runtime/src/build/runtime-manifest.ts:1:// packages/pt-runtime/src/build/runtime-manifest.ts
packages/pt-runtime/src/build/runtime-manifest.ts:3:// Usado por render-runtime-v2.ts para generar runtime.js
packages/pt-runtime/src/build/runtime-manifest.ts:13:  // Se genera como catalog.js separado, cargado primero por main.js.
packages/pt-runtime/src/build/runtime-manifest.ts:112:    "handlers/ios-plan-builder.ts",
packages/pt-runtime/src/build/runtime-manifest.ts:187:  // NOTE: kernel and terminal are NOT included in runtime.js.
packages/pt-runtime/src/build/runtime-manifest.ts:188:  // They belong exclusively to main.js (MAIN_MANIFEST).
packages/pt-runtime/src/build/runtime-manifest.ts:189:  // runtime.js only contains: ptApi, runtime contracts, utils, core, and handlers.
packages/pt-runtime/src/build/runtime-manifest.ts:200:  // Exclude "catalog" section — it goes to catalog.js, not runtime.js
packages/pt-runtime/src/build/runtime-manifest.ts:300:  buildFingerprint: string;
packages/pt-runtime/src/build/runtime-manifest.ts:372:  build(): RuntimeManifest {
packages/pt-runtime/src/build/runtime-manifest.ts:380:      buildFingerprint: this._fingerprint,
packages/pt-runtime/src/build/runtime-manifest.ts:392:    return JSON.stringify(this.build(), null, 2);
packages/pt-runtime/src/build/runtime-manifest.ts:408:  build(): RuntimeManifest;
packages/pt-runtime/src/build/runtime-manifest.ts:424:  if (!manifest.buildFingerprint || typeof manifest.buildFingerprint !== "string") {
packages/pt-runtime/src/build/runtime-manifest.ts:425:    errors.push("manifest.buildFingerprint is required and must be a string");
packages/pt-runtime/src/build/main-generator.ts:1:// packages/pt-runtime/src/build/main-generator.ts
packages/pt-runtime/src/build/main-generator.ts:2:// Generador de main.js — asset PT-safe mínimo y estable.
packages/pt-runtime/src/build/main-generator.ts:4:// Responsabilidades de main.js:
packages/pt-runtime/src/build/main-generator.ts:9://   - Runtime loader wiring — carga de runtime.js
packages/pt-runtime/src/build/main-generator.ts:25:  buildFingerprint: string;
packages/pt-runtime/src/build/main-generator.ts:59:      "main.js manifest missing transitive dependencies:\n" +
packages/pt-runtime/src/build/main-generator.ts:61:        "\nAdd them to MAIN_MANIFEST before building.",
packages/pt-runtime/src/build/main-generator.ts:73:  const buildTimestamp = new Date().toISOString();
packages/pt-runtime/src/build/main-generator.ts:370:  const entryPoints = `
packages/pt-runtime/src/build/main-generator.ts:375:  if (typeof dprint === "function") dprint("[main] PT-SCRIPT v2 active (build: " + "${buildTimestamp}" + ")");
packages/pt-runtime/src/build/main-generator.ts:441:// Do not edit directly — regenerate with: bun run pt:build
packages/pt-runtime/src/build/main-generator.ts:442:// Generated at: ${buildTimestamp}
packages/pt-runtime/src/build/main-generator.ts:443:// Build ID: ${buildTimestamp.replace(/[:.]/g, "-")}
packages/pt-runtime/src/build/main-generator.ts:446://   main.js    = kernel IIFE + file loader (this file)
packages/pt-runtime/src/build/main-generator.ts:448://   runtime.js = all handlers + dispatcher (hot-reloaded by kernel)
packages/pt-runtime/src/build/main-generator.ts:453:  const fullCode = header + kernelIife + fileLoader + entryPoints;
packages/pt-runtime/src/build/main-generator.ts:461:    structuralErrors.push("main.js must contain function main()");
packages/pt-runtime/src/build/main-generator.ts:464:    structuralErrors.push("main.js must contain function cleanUp()");
packages/pt-runtime/src/build/catalog-generator.ts:1:// packages/pt-runtime/src/build/catalog-generator.ts
packages/pt-runtime/src/build/catalog-generator.ts:34:  // No editar directamente — regenerar con: bun run build:catalog
packages/pt-runtime/src/build/catalog-generator.ts:37:  // Exponer constantes al scope global de PT para que runtime.js pueda acceder
packages/pt-runtime/src/build/catalog-generator.ts:103:  const buildTimestamp = new Date().toISOString();
packages/pt-runtime/src/build/catalog-generator.ts:105:// Do not edit directly — regenerate with: bun run build:catalog
packages/pt-runtime/src/build/catalog-generator.ts:106:// Generated at: ${buildTimestamp}
packages/pt-runtime/src/build/render-runtime-v2.ts:180:      `[render-runtime-v2] BUILD FAILED: runtime.js manifest is missing ${missingDependencies.length} transitive dependenc${missingDependencies.length === 1 ? "y" : "ies"}.\n` +
packages/pt-runtime/src/build/render-runtime-v2.ts:182:        `Add them to the appropriate section in packages/pt-runtime/src/build/runtime-manifest.ts:\n` +
packages/pt-runtime/src/build/render-runtime-v2.ts:209:    console.warn("[render-runtime-v2] PT-safe validation warnings ignored for build continuity.");
packages/pt-runtime/src/build/render-runtime-v2.ts:215:// Do not edit directly - regenerate with: bun run build:runtime-v2
packages/pt-runtime/src/build/render-runtime-v2.ts:235:    console.warn("[render-runtime-v2] PT-safe validation warnings ignored for build continuity.");
packages/pt-runtime/src/build/render-runtime-v2.ts:241:// Do not edit directly - regenerate with: bun run build:runtime-v2
packages/pt-runtime/src/build/render-from-handlers.ts:1:// packages/pt-runtime/src/build/render-from-handlers.ts
packages/pt-runtime/src/build/render-from-handlers.ts:2:// Renderer simplificado que toma handlers y genera runtime.js PT-safe
packages/pt-runtime/src/build/render-from-handlers.ts:74:    throw new Error("runtime.js generation failed PT-safe validation");
packages/pt-runtime/src/build/runtime-module-manifest.ts:1:// packages/pt-runtime/src/build/runtime-module-manifest.ts
packages/pt-runtime/src/build/runtime-module-manifest.ts:66:  // NOTE: kernel is NOT a runtime module — it lives exclusively in main.js (MAIN_MANIFEST).
packages/pt-runtime/src/build/__tests__/runtime-module-manifest.test.ts:1:// packages/pt-runtime/src/build/__tests__/runtime-module-manifest.test.ts
packages/pt-runtime/src/build/__tests__/main-generator.test.ts:1:// packages/pt-runtime/src/build/__tests__/main-generator.test.ts
packages/pt-runtime/src/build/__tests__/main-generator.test.ts:75:      outputPath: path.join(tempDir, "out", "main.js"),
packages/pt-runtime/src/build/__tests__/main-generator.test.ts:78:      buildFingerprint: "test-fingerprint-123",
packages/pt-runtime/src/build/__tests__/templates.test.ts:1:// packages/pt-runtime/src/build/__tests__/templates.test.ts
packages/pt-runtime/src/build/__tests__/templates.test.ts:7:  entryPointsTemplate,
packages/pt-runtime/src/build/__tests__/templates.test.ts:156:  describe("entryPointsTemplate", () => {
packages/pt-runtime/src/build/__tests__/templates.test.ts:158:      const result = entryPointsTemplate({
packages/pt-runtime/src/build/__tests__/templates.test.ts:160:        buildTimestamp: "2024-01-01T00:00:00.000Z",
packages/pt-runtime/src/build/__tests__/templates.test.ts:167:      const result = entryPointsTemplate({
packages/pt-runtime/src/build/__tests__/templates.test.ts:169:        buildTimestamp: "2024-01-01T00:00:00.000Z",
packages/pt-runtime/src/build/__tests__/templates.test.ts:175:      const result = entryPointsTemplate({
packages/pt-runtime/src/build/__tests__/templates.test.ts:177:        buildTimestamp: "2024-01-01T00:00:00.000Z",
packages/pt-runtime/src/build/__tests__/templates.test.ts:183:      const result = entryPointsTemplate({
packages/pt-runtime/src/build/__tests__/templates.test.ts:185:        buildTimestamp: "2024-01-01T00:00:00.000Z",
packages/pt-runtime/src/build/__tests__/templates.test.ts:191:      const result = entryPointsTemplate({
packages/pt-runtime/src/build/__tests__/templates.test.ts:193:        buildTimestamp: "2024-01-01T00:00:00.000Z",
packages/pt-runtime/src/build/__tests__/templates.test.ts:202:    it("includes buildTimestamp in output", () => {
```
