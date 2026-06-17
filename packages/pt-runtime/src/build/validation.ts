import { validateBalancedSyntax, validateMainBootstrapContract, validateRuntimeBootstrapContract } from "./syntax-preflight";
import { shouldShowValidationDetails } from "./build-utils.js";
import { validatePtSafe, formatValidationResult } from "./validate-pt-safe.js";

export function validateGeneratedArtifacts(main: string, catalog: string, runtime: string): void {
  const errors: string[] = [];

  // ── Fast validators first (short-circuit on failure) ────────────
  const mainSyntax = validateBalancedSyntax(main);
  if (!mainSyntax.valid) {
    const errMsg = mainSyntax.errors[0]?.message ?? "unknown error";
    throw new Error(`main.js has invalid JavaScript syntax: ${errMsg}`);
  }

  const catalogSyntax = validateBalancedSyntax(catalog);
  if (!catalogSyntax.valid) {
    const errMsg = catalogSyntax.errors[0]?.message ?? "unknown error";
    throw new Error(`catalog.js has invalid JavaScript syntax: ${errMsg}`);
  }

  const runtimeSyntax = validateBalancedSyntax(runtime);
  if (!runtimeSyntax.valid) {
    const errMsg = runtimeSyntax.errors[0]?.message ?? "unknown error";
    throw new Error(`runtime.js has invalid JavaScript syntax: ${errMsg}`);
  }

  // ── PT-safety validation (AST / forbidden patterns) ──────────────
  const mainPTSafe = validatePtSafe(main);
  if (!mainPTSafe.valid) {
    throw new Error(`main.js is not PT-safe:\n${formatValidationResult(mainPTSafe)}`);
  }

  const catalogPTSafe = validatePtSafe(catalog);
  if (!catalogPTSafe.valid) {
    throw new Error(`catalog.js is not PT-safe:\n${formatValidationResult(catalogPTSafe)}`);
  }

  const runtimePTSafe = validatePtSafe(runtime);
  if (!runtimePTSafe.valid) {
    throw new Error(`runtime.js is not PT-safe:\n${formatValidationResult(runtimePTSafe)}`);
  }

  const mainContract = validateMainBootstrapContract(main);
  const runtimeContract = validateRuntimeBootstrapContract(runtime);

  if (!mainContract.valid) {
    errors.push(`main.js contract: ${mainContract.errors.map(e => e.message).join(", ")}`);
  }
  if (!runtimeContract.valid) {
    errors.push(`runtime.js contract: ${runtimeContract.errors.map(e => e.message).join(", ")}`);
  }

  if (errors.length > 0) {
    throw new Error("Generated code contract validation failed: " + errors.join(", "));
  }

  if (shouldShowValidationDetails()) {
    console.log("✅ All artifacts passed validation (syntax + safety + contract)");
  }
}
