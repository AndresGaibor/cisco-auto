import { validateBalancedSyntax, validateMainBootstrapContract, validateRuntimeBootstrapContract } from "./syntax-preflight";
import { shouldShowValidationDetails } from "./build-utils.js";

export function validateGeneratedArtifacts(main: string, catalog: string, runtime: string): void {
  const errors: string[] = [];

  // ── Fast validators first (short-circuit on failure) ────────────
  const mainSyntax = validateBalancedSyntax(main);
  if (!mainSyntax.valid) {
    errors.push(`main.js syntax: ${mainSyntax.errors.length} error(s)`);
    console.error("main.js syntax errors:", JSON.stringify(mainSyntax.errors, null, 2));
  }

  const catalogSyntax = validateBalancedSyntax(catalog);
  if (!catalogSyntax.valid) {
    errors.push(`catalog.js syntax: ${catalogSyntax.errors.length} error(s)`);
  }

  const runtimeSyntax = validateBalancedSyntax(runtime);
  if (!runtimeSyntax.valid) {
    errors.push(`runtime.js syntax: ${runtimeSyntax.errors.length} error(s)`);
    console.error("runtime.js syntax errors:", JSON.stringify(runtimeSyntax.errors, null, 2));
  }

  if (errors.length > 0) {
    console.warn("Generated code validation warnings/errors: " + errors.join(", "));
    return;
  }

  const mainContract = validateMainBootstrapContract(main);
  const runtimeContract = validateRuntimeBootstrapContract(runtime);

  if (!mainContract.valid) {
    errors.push(`main.js contract: ${mainContract.errors.length} error(s)`);
  }
  if (!runtimeContract.valid) {
    errors.push(`runtime.js contract: ${runtimeContract.errors.length} error(s)`);
  }

  if (errors.length > 0) {
    console.warn("Generated code validation warnings/errors: " + errors.join(", "));
    return;
  }

  if (shouldShowValidationDetails()) {
    console.log("✅ All artifacts passed validation (syntax + contract)");
  }
}
