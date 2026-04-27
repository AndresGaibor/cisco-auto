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
    runtimeContract.valid;

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
    if (!mainValidation.valid) {
      console.warn("main.js PT-safe issues:", JSON.stringify(mainValidation.errors, null, 2));
    }
    if (!catalogValidation.valid) {
      console.warn("catalog.js PT-safe issues:", JSON.stringify(catalogValidation.errors, null, 2));
    }
    if (!runtimeValidation.valid) {
      console.warn("runtime.js PT-safe issues:", JSON.stringify(runtimeValidation.errors, null, 2));
    }
    if (!mainEs5.valid) {
      console.warn("main.js ES5 issues:", JSON.stringify(mainEs5.errors, null, 2));
    }
    if (!runtimeEs5.valid) {
      console.warn("runtime.js ES5 issues:", JSON.stringify(runtimeEs5.errors, null, 2));
    }
    if (!mainCompat.valid) {
      console.warn("main.js PT-safe compat issues:", JSON.stringify(mainCompat.errors, null, 2));
    }
    if (!catalogCompat.valid) {
      console.warn("catalog.js PT-safe compat issues:", JSON.stringify(catalogCompat.errors, null, 2));
    }
    if (!runtimeCompat.valid) {
      console.warn("runtime.js PT-safe compat issues:", JSON.stringify(runtimeCompat.errors, null, 2));
    }
    console.warn("Generated code validation warnings/errors: " + errors.join(", "));
  }
}
