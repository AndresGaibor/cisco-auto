/**
 * Handler module barrel.
 *
 * La ruta principal sigue siendo runtime-handlers.ts porque el build actual
 * depende de ese entrypoint. Los grupos de registro viven en handlers/registration.
 */

export * from "./runtime-handlers.js";
export * from "./registration/runtime-registration.js";
export * from "./registration/stable-handlers.js";
export * from "./registration/experimental-handlers.js";
export * from "./registration/omni-handlers.js";
