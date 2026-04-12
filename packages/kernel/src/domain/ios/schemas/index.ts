// Schemas de configuración IOS con validación rica usando Value Objects
// Todos los schemas usan VOs del kernel para garantizar validez en tiempo de construcción

// Routing
export * from './routing/index.js';

// Security
export * from './security/index.js';

// Switching
export * from './switching/index.js';

// Services
export * from './services/index.js';

// Interface
export { interfaceConfigSchema } from './interface.schema.js';
export type { InterfaceConfig, InterfaceConfigInput } from './interface.schema.js';
