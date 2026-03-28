/**
 * TOOL REGISTRY - TIPOS BASE
 * 
 * Define los tipos fundamentales para el sistema de Tool Registry
 * que adapta las tools del MCP-Packet-Tracer a comandos CLI.
 */

// =============================================================================
// TOOL BASE
// =============================================================================

/**
 * Schema de entrada para una tool (basado en JSON Schema)
 */
export interface ToolInputSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, ToolInputProperty>;
  required?: string[];
  items?: ToolInputSchema;
  description?: string;
  enum?: readonly string[];
  default?: unknown;
}

/**
 * Propiedad individual dentro del schema de entrada
 */
export interface ToolInputProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: readonly string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: ToolInputSchema;
}

/**
 * Entrada genérica para una tool
 */
export type ToolInput = Record<string, unknown>;

/**
 * Resultado exitoso de una tool
 */
export interface ToolResultSuccess<T = unknown> {
  success: true;
  data: T;
  metadata?: ToolResultMetadata;
}

/**
 * Error en la ejecución de una tool
 */
export interface ToolResultError {
  success: false;
  error: ToolError;
}

/**
 * Resultado de una tool (éxito o error)
 */
export type ToolResult<T = unknown> = ToolResultSuccess<T> | ToolResultError;

/**
 * Metadatos del resultado de una tool
 */
export interface ToolResultMetadata {
  /** Duración de la ejecución en milisegundos */
  duration?: number;
  
  /** Número de items procesados */
  itemCount?: number;
  
  /** Timestamp de inicio */
  startedAt?: Date;
  
  /** Timestamp de fin */
  completedAt?: Date;
  
  /** Warnings generados durante la ejecución */
  warnings?: string[];
  
  /** Información adicional */
  extras?: Record<string, unknown>;
}

/**
 * Error de tool
 */
export interface ToolError {
  /** Código de error */
  code: string;
  
  /** Mensaje legible para humanos */
  message: string;
  
  /** Descripción detallada */
  details?: string;
  
  /** Causa raíz */
  cause?: string;
  
  /** Sugerencias de corrección */
  suggestions?: string[];
  
  /** Stack trace (solo en modo debug) */
  stack?: string;
}

/**
 * Handler de una tool
 * Ejecuta la lógica de la tool y retorna el resultado
 */
export type ToolHandler<TInput extends ToolInput = ToolInput, TOutput = unknown> = (
  input: TInput,
  context: ToolExecutionContext
) => Promise<ToolResult<TOutput>>;

/**
 * Contexto de ejecución de una tool
 */
export interface ToolExecutionContext {
  /** Logger para la tool */
  logger: ToolLogger;
  
  /** Configuración global */
  config: ToolConfig;
  
  /** Cliente del bridge HTTP */
  bridgeClient?: BridgeClient;
  
  /** Token de cancelación */
  signal?: AbortSignal;
  
  /** Timeout en milisegundos */
  timeout?: number;
}

/**
 * Logger para tools
 */
export interface ToolLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Configuración para tools
 */
export interface ToolConfig {
  /** Directorio de trabajo */
  workingDir: string;
  
  /** Directorio de salida */
  outputDir?: string;
  
  /** Modo verbose */
  verbose?: boolean;
  
  /** Formato de salida */
  outputFormat?: 'json' | 'yaml' | 'table' | 'text';
  
  /** Configuración adicional */
  [key: string]: unknown;
}

/**
 * Cliente para el bridge HTTP de Packet Tracer
 */
export interface BridgeClient {
  /** Verifica si el bridge está disponible */
  isAvailable(): Promise<boolean>;
  
  /** Envía un comando a Packet Tracer */
  execute(command: string, args?: unknown[]): Promise<unknown>;
  
  /** Obtiene el estado del bridge */
  getStatus(): Promise<BridgeStatus>;
  
  /** Obtiene la topología actual */
  getTopology(): Promise<unknown>;
}

/**
 * Estado del bridge
 */
export interface BridgeStatus {
  connected: boolean;
  version?: string;
  uptime?: number;
  ptVersion?: string;
}

/**
 * Definición completa de una tool
 */
export interface Tool<TInput extends ToolInput = ToolInput, TOutput = unknown> {
  /** Nombre único de la tool */
  name: string;
  
  /** Descripción breve */
  description: string;
  
  /** Descripción detallada (para help) */
  longDescription?: string;
  
  /** Schema de entrada */
  inputSchema: ToolInputSchema;
  
  /** Función que ejecuta la tool */
  handler: ToolHandler<TInput, TOutput>;
  
  /** Categoría de la tool */
  category?: ToolCategory;
  
  /** Tags para búsqueda */
  tags?: string[];
  
  /** Ejemplos de uso */
  examples?: ToolExample[];
  
  /** Configuración de la tool */
  config?: ToolConfigDefinition;
}

/**
 * Categoría de tool
 */
export type ToolCategory = 
  | 'catalog'
  | 'topology'
  | 'validation'
  | 'generation'
  | 'deploy'
  | 'analysis'
  | 'utility';

/**
 * Ejemplo de uso de una tool
 */
export interface ToolExample {
  /** Descripción del ejemplo */
  description: string;
  
  /** Entrada del ejemplo */
  input: ToolInput;
  
  /** Salida esperada (opcional) */
  output?: unknown;
}

/**
 * Configuración de una tool
 */
export interface ToolConfigDefinition {
  /** Timeout por defecto (ms) */
  timeout?: number;
  
  /** ¿Requiere bridge? */
  requiresBridge?: boolean;
  
  /** ¿Es experimental? */
  experimental?: boolean;
  
  /** Versión de la tool */
  version?: string;
}

// =============================================================================
// TOOL REGISTRY
// =============================================================================

/**
 * Registro de tools
 */
export interface ToolRegistry {
  /** Registra una nueva tool */
  register<TInput extends ToolInput = ToolInput, TOutput = unknown>(
    tool: Tool<TInput, TOutput>
  ): void;
  
  /** Obtiene una tool por nombre */
  get<TInput extends ToolInput = ToolInput, TOutput = unknown>(
    name: string
  ): Tool<TInput, TOutput> | undefined;
  
  /** Lista todas las tools */
  list(): Tool[];
  
  /** Lista tools por categoría */
  listByCategory(category: ToolCategory): Tool[];
  
  /** Busca tools por tags */
  search(query: string): Tool[];
  
  /** Verifica si existe una tool */
  has(name: string): boolean;
  
  /** Ejecuta una tool por nombre */
  execute<TInput extends ToolInput = ToolInput, TOutput = unknown>(
    name: string,
    input: TInput,
    context?: Partial<ToolExecutionContext>
  ): Promise<ToolResult<TOutput>>;
  
  /** Elimina una tool */
  unregister(name: string): boolean;
}

// =============================================================================
// TOPOLOGY PLAN - TIPOS ESPECÍFICOS
// =============================================================================

/**
 * Plan de topología generado por pt_plan_topology
 */
export interface TopologyPlan {
  /** ID único del plan */
  id: string;
  
  /** Nombre del plan */
  name: string;
  
  /** Descripción */
  description?: string;
  
  /** Dispositivos en el plan */
  devices: DevicePlan[];
  
  /** Enlaces entre dispositivos */
  links: LinkPlan[];
  
  /** Parámetros de generación */
  params: TopologyPlanParams;
  
  /** Validación del plan */
  validation?: TopologyPlanValidation;
  
  /** Metadatos */
  metadata?: TopologyPlanMetadata;
}

/**
 * Parámetros para generar un plan de topología
 */
export interface TopologyPlanParams {
  /** Número de routers */
  routerCount: number;
  
  /** Número de switches */
  switchCount: number;
  
  /** Número de PCs */
  pcCount: number;
  
  /** Número de servidores */
  serverCount?: number;
  
  /** Tipo de red */
  networkType: NetworkType;
  
  /** Protocolo de enrutamiento */
  routingProtocol?: RoutingProtocol;
  
  /** ¿Habilitar DHCP? */
  dhcpEnabled?: boolean;
  
  /** VLANs a crear */
  vlans?: number[];
  
  /** Dirección de red base */
  baseNetwork?: string;
  
  /** Máscara de subred */
  subnetMask?: string;
}

/**
 * Tipo de red
 */
export type NetworkType = 
  | 'single_lan'
  | 'multi_lan'
  | 'multi_lan_wan'
  | 'star'
  | 'hub_spoke'
  | 'router_on_a_stick'
  | 'triangle'
  | 'custom';

/**
 * Protocolo de enrutamiento
 */
export type RoutingProtocol = 'ospf' | 'eigrp' | 'bgp' | 'static' | 'none';

/**
 * Dispositivo en el plan
 */
export interface DevicePlan {
  /** ID del dispositivo */
  id: string;
  
  /** Nombre */
  name: string;
  
  /** Tipo de modelo */
  model: DeviceModelPlan;
  
  /** Posición en el canvas */
  position: PlanPosition;
  
  /** Interfaces configuradas */
  interfaces: InterfacePlan[];
  
  /** Configuración de VLANs (si aplica) */
  vlans?: VLANPlan[];
  
  /** Configuración de DHCP (si aplica) */
  dhcp?: DHCPPlan[];
  
  /** Configuración de routing (si aplica) */
  routing?: RoutingPlan;
  
  /** Credenciales */
  credentials?: CredentialsPlan;
}

/**
 * Modelo de dispositivo en el plan
 */
export interface DeviceModelPlan {
  /** Nombre del modelo */
  name: string;
  
  /** Tipo de dispositivo */
  type: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server';
  
  /** Categoría Packet Tracer */
  ptType: string;
  
  /** Puertos disponibles */
  ports: PortInfo[];
}

/**
 * Información de puerto
 */
export interface PortInfo {
  /** Nombre del puerto */
  name: string;
  
  /** Tipo */
  type: 'ethernet' | 'serial' | 'fastethernet' | 'gigabitethernet';
  
  /** ¿Disponible? */
  available: boolean;
}

/**
 * Posición en el canvas del plan
 */
export interface PlanPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Interfaz en el plan
 */
export interface InterfacePlan {
  /** Nombre */
  name: string;
  
  /** IP (si tiene) */
  ip?: string;
  
  /** Máscara */
  subnetMask?: string;
  
  /** ¿Configurada? */
  configured: boolean;
  
  /** VLAN (si aplica) */
  vlan?: number;
  
  /** Descripción */
  description?: string;
}

/**
 * VLAN en el plan
 */
export interface VLANPlan {
  /** ID */
  id: number;
  
  /** Nombre */
  name: string;
  
  /** ¿ DHCP pool? */
  dhcpPool?: string;
  
  /** Rango de IPs */
  ipRange?: string;
}

/**
 * Configuración DHCP en el plan
 */
export interface DHCPPlan {
  /** Nombre del pool */
  poolName: string;
  
  /** Red */
  network: string;
  
  /** Máscara */
  subnetMask: string;
  
  /** Gateway por defecto */
  defaultRouter: string;
  
  /** DNS (opcional) */
  dnsServer?: string;
  
  /** Rango de exclusión */
  exclude?: string[];
}

/**
 * Configuración de routing en el plan
 */
export interface RoutingPlan {
  /** Tipo de protocolo */
  protocol: RoutingProtocol;
  
  /** Configuración OSPF */
  ospf?: OSPFPlanConfig;
  
  /** Configuración EIGRP */
  eigrp?: EIGRPPlanConfig;
  
  /** Rutas estáticas */
  static?: StaticRoutePlan[];
}

/**
 * Configuración OSPF en el plan
 */
export interface OSPFPlanConfig {
  /** ID del proceso */
  processId: number;
  
  /** Router ID */
  routerId?: string;
  
  /** Áreas */
  areas: OSPFAreaPlan[];
  
  /** Red por defecto */
  defaultRoute?: boolean;
}

/**
 * Área OSPF en el plan
 */
export interface OSPFAreaPlan {
  /** Número de área */
  area: number;
  
  /** Redes en el área */
  networks: string[];
}

/**
 * Configuración EIGRP en el plan
 */
export interface EIGRPPlanConfig {
  /** AS Number */
  asNumber: number;
  
  /** Networks */
  networks: string[];
  
  /** Red por defecto */
  defaultRoute?: boolean;
}

/**
 * Ruta estática en el plan
 */
export interface StaticRoutePlan {
  /** Red destino */
  network: string;
  
  /** Máscara */
  mask: string;
  
  /** Siguiente salto */
  nextHop: string;
}

/**
 * Credenciales en el plan
 */
export interface CredentialsPlan {
  /** Usuario */
  username: string;
  
  /** Contraseña (puede ser variable de entorno) */
  password: string;
  
  /** Password de enable */
  enablePassword?: string;
}

/**
 * Enlace entre dispositivos en el plan
 */
export interface LinkPlan {
  /** ID del enlace */
  id: string;
  
  /** Dispositivo origen */
  from: LinkEndpoint;
  
  /** Dispositivo destino */
  to: LinkEndpoint;
  
  /** Tipo de cable */
  cableType: CableTypePlan;
  
  /** ¿Validado? */
  validated: boolean;
  
  /** Errores (si hay) */
  errors?: string[];
}

/**
 * Endpoint de un enlace
 */
export interface LinkEndpoint {
  /** ID del dispositivo */
  deviceId: string;
  
  /** Nombre del dispositivo */
  deviceName: string;
  
  /** Puerto */
  port: string;
}

/**
 * Tipo de cable
 */
export type CableTypePlan = 
  | 'straight-through'
  | 'crossover'
  | 'fiber'
  | 'serial'
  | 'console'
  | 'auto';

/**
 * Validación del plan de topología
 */
export interface TopologyPlanValidation {
  /** ¿Es válido? */
  valid: boolean;
  
  /** Errores */
  errors: ValidationError[];
  
  /** Warnings */
  warnings: ValidationWarning[];
  
  /** Suggestions de auto-fix */
  suggestions?: FixSuggestion[];
}

/**
 * Error de validación
 */
export interface ValidationError {
  /** Tipo de error */
  type: ValidationErrorType;
  
  /** Mensaje */
  message: string;
  
  /** Dispositivo o enlace afectado */
  affected?: string;
  
  /** Severidad */
  severity: 'error' | 'critical';
}

/**
 * Tipo de error de validación
 */
export type ValidationErrorType = 
  | 'invalid_model'
  | 'invalid_port'
  | 'invalid_cable'
  | 'ip_conflict'
  | 'duplicate_name'
  | 'missing_ip'
  | 'invalid_subnet'
  | 'port_unavailable'
  | 'vlan_mismatch'
  | 'routing_conflict';

/**
 * Warning de validación
 */
export interface ValidationWarning {
  /** Tipo de warning */
  type: ValidationWarningType;
  
  /** Mensaje */
  message: string;
  
  /** Afectado */
  affected?: string;
}

/**
 * Tipo de warning de validación
 */
export type ValidationWarningType = 
  | 'suboptimal_cable'
  | 'unused_port'
  | 'unused_vlan'
  | 'recommendation';

/**
 * Sugerencia de auto-fix
 */
export interface FixSuggestion {
  /** Descripción */
  description: string;
  
  /** Acción a realizar */
  action: FixAction;
  
  /** ¿Automático? */
  autoFixable: boolean;
}

/**
 * Acción de fix
 */
export interface FixAction {
  /** Tipo de acción */
  type: 'replace_ip' | 'change_cable' | 'use_alternative_port' | 'add_route';
  
  /** Valores actuales */
  from: unknown;
  
  /** Valores propuestos */
  to: unknown;
}

/**
 * Metadatos del plan
 */
export interface TopologyPlanMetadata {
  /** Fecha de creación */
  createdAt: Date;
  
  /** Fecha de actualización */
  updatedAt?: Date;
  
  /** Versión del generador */
  generatorVersion?: string;
  
  /** Usuario que generó el plan */
  generatedBy?: string;
}

// =============================================================================
// DEPLOY TYPES - Shared deploy types used by tools
// =============================================================================

/**
 * Representa una configuración de dispositivo lista para desplegar
 */
export interface DeployedDevice {
  deviceId: string;
  deviceName: string;
  deviceType: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server';
  iosConfig: string;
  yamlConfig?: string;
  jsonConfig?: string;
}

/**
 * Dispositivo fallido durante un deploy
 */
export interface FailedDevice {
  deviceId: string;
  deviceName?: string;
  reason: string;
  error?: ToolError;
}

/**
 * Resumen del proceso de deploy/generación de configuraciones
 */
export interface DeploySummary {
  totalDevices: number;
  routerCount: number;
  switchCount: number;
  pcCount: number;
  serverCount: number;
  totalLines: number;
  unconfiguredDevices: string[];
  // Estado de despliegue (opcional)
  deployedCount?: number;
  failedCount?: number;
  failedDevices?: FailedDevice[];
}
