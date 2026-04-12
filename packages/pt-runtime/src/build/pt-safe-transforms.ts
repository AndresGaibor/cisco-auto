// packages/pt-runtime/src/build/pt-safe-transforms.ts
// Transforms to make TS code compatible with PT Script Module

export interface TransformOptions {
  wrapInFunction?: boolean;
  functionName?: string;
  injectGlobals?: string[];
}

/**
 * Transform TS/JS code to PT-safe JavaScript
 */
export function transformToPtSafe(code: string, options?: TransformOptions): string {
  let result = code;
  
  // Remove import statements (will be inlined or global)
  result = result.replace(/^import .+ from .+;?\s*$/gm, "");
  
  // Remove export statements (will be returned or global)
  result = result.replace(/^export (?:const|let|var|function|class|type|interface) /gm, "");
  result = result.replace(/^export \{[^}]+\};?\s*$/gm, "");
  result = result.replace(/^export default .+;?\s*$/gm, "");
  
  // Remove type annotations (simple pass)
  result = result.replace(/: (\w+)(?=[,\)\s=;])/g, ""); // : Type
  result = result.replace(/<\w+>/g, ""); // <Type>
  
  // Wrap in function if specified
  if (options?.wrapInFunction && options?.functionName) {
    const globals = options.injectGlobals?.join(", ") || "";
    result = `function ${options.functionName}(payload, api) {\n${result}\n}`;
  }
  
  return result;
}

/**
 * Wrap runtime code with PT bootstrap
 */
export function wrapRuntimeBootstrap(code: string): string {
  return `
// PT Runtime - Generated from TypeScript
// Do not edit directly - regenerate with bun run build:runtime

var RUNTIME_EXPORTS = {};

(function() {
${code}
})();

// Export dispatch function
var dispatch = RUNTIME_EXPORTS.dispatch;
`;
}

/**
 * Wrap main kernel code with PT bootstrap
 */
export function wrapMainBootstrap(code: string): string {
  return `
// PT Main Kernel - Generated from TypeScript
// Do not edit directly - regenerate with bun run build:main

${code}

// PT Script Module entry points
function main() {
  bootKernel(CONFIG);
}

function cleanUp() {
  shutdownKernel();
}
`;
}