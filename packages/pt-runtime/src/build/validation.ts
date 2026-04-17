import { validateBalancedSyntax, validateMainBootstrapContract, validateRuntimeBootstrapContract } from "./syntax-preflight";
import { validatePtSafe } from "./validate-pt-safe";

export function validateGeneratedArtifacts(main: string, catalog: string, runtime: string): void {
  const mainSyntax = validateBalancedSyntax(main);
  const catalogSyntax = validateBalancedSyntax(catalog);
  const runtimeSyntax = validateBalancedSyntax(runtime);
  const mainContract = validateMainBootstrapContract(main);
  const runtimeContract = validateRuntimeBootstrapContract(runtime);
  const mainValidation = validatePtSafe(main);
  const catalogValidation = validatePtSafe(catalog);
  const runtimeValidation = validatePtSafe(runtime);

  const allValid =
    mainSyntax.valid &&
    catalogSyntax.valid &&
    runtimeSyntax.valid &&
    mainContract.valid &&
    runtimeContract.valid &&
    mainValidation.valid &&
    catalogValidation.valid &&
    runtimeValidation.valid;

  if (!allValid) {
    const errors: string[] = [];
    if (!mainSyntax.valid) {
      errors.push(`main.js syntax: ${mainSyntax.errors.length} error(s)`);
      console.error("main.js syntax errors:", JSON.stringify(mainSyntax.errors, null, 2));
    }
    if (!catalogSyntax.valid) {
      errors.push(`catalog.js syntax: ${catalogSyntax.errors.length} error(s)`);
    }
    if (!runtimeSyntax.valid) {
      errors.push(`runtime.js syntax: ${runtimeSyntax.errors.length} error(s)`);
      console.error("runtime.js syntax errors:", JSON.stringify(runtimeSyntax.errors, null, 2));
    }
    if (!mainContract.valid) {
      errors.push(`main.js contract: ${mainContract.errors.length} error(s)`);
    }
    if (!runtimeContract.valid) {
      errors.push(`runtime.js contract: ${runtimeContract.errors.length} error(s)`);
    }
    if (!mainValidation.valid) errors.push(`main.js: ${mainValidation.errors.length} error(s)`);
    if (!catalogValidation.valid) {
      errors.push(`catalog.js: ${catalogValidation.errors.length} error(s)`);
    }
    if (!runtimeValidation.valid) {
      errors.push(`runtime.js: ${runtimeValidation.errors.length} error(s)`);
    }
    throw new Error("Generated code validation failed: " + errors.join(", "));
  }
}
