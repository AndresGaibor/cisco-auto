import { validateBalancedSyntax, validateMainBootstrapContract, validateRuntimeBootstrapContract } from "./syntax-preflight";
import { validatePtSafe, formatValidationResult } from "./validate-pt-safe";
import { validateES5, type ES5ValidationResult } from "../compat/es5-validator";
import { validatePTSafe as validatePTSafeCompat } from "../compat/pt-safe-validator";

export function validateGeneratedArtifacts(main: string, catalog: string, runtime: string): void {
  const mainSyntax = validateBalancedSyntax(main);
  const catalogSyntax = validateBalancedSyntax(catalog);
  const runtimeSyntax = validateBalancedSyntax(runtime);
  const mainContract = validateMainBootstrapContract(main);
  const runtimeContract = validateRuntimeBootstrapContract(runtime);
  const mainValidation = validatePtSafe(main);
  const catalogValidation = validatePtSafe(catalog);
  const runtimeValidation = validatePtSafe(runtime);

  const mainEs5 = validateES5(main);
  const runtimeEs5 = validateES5(runtime);
  const mainCompat = validatePTSafeCompat(main);
  const catalogCompat = validatePTSafeCompat(catalog);
  const runtimeCompat = validatePTSafeCompat(runtime);

  const allValid =
    mainSyntax.valid &&
    catalogSyntax.valid &&
    runtimeSyntax.valid &&
    mainContract.valid &&
    runtimeContract.valid &&
    mainValidation.valid &&
    catalogValidation.valid &&
    runtimeValidation.valid &&
    mainEs5.valid &&
    runtimeEs5.valid &&
    mainCompat.valid &&
    catalogCompat.valid &&
    runtimeCompat.valid;

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
    if (!mainEs5.valid) {
      errors.push(`main.js ES5: ${mainEs5.errors.length} error(s)`);
      console.error("main.js ES5 errors:", JSON.stringify(mainEs5.errors, null, 2));
    }
    if (!runtimeEs5.valid) {
      errors.push(`runtime.js ES5: ${runtimeEs5.errors.length} error(s)`);
      console.error("runtime.js ES5 errors:", JSON.stringify(runtimeEs5.errors, null, 2));
    }
    if (!mainCompat.valid) errors.push(`main.js PT-safe: ${mainCompat.errors.length} error(s)`);
    if (!catalogCompat.valid) {
      errors.push(`catalog.js PT-safe: ${catalogCompat.errors.length} error(s)`);
    }
    if (!runtimeCompat.valid) {
      errors.push(`runtime.js PT-safe: ${runtimeCompat.errors.length} error(s)`);
    }
    throw new Error("Generated code validation failed: " + errors.join(", "));
  }
}
