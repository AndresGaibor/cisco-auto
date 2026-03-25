import { z } from 'zod';

export const ToolCategorySchema = z.enum([
  'catalog',
  'topology',
  'validation',
  'generation',
  'deploy',
  'analysis',
  'utility'
]);

export const NetworkTypeSchema = z.enum([
  'single_lan',
  'multi_lan',
  'multi_lan_wan',
  'star',
  'hub_spoke',
  'router_on_a_stick',
  'triangle',
  'custom'
]);

export const RoutingProtocolSchema = z.enum([
  'ospf',
  'eigrp',
  'bgp',
  'static',
  'none'
]);

export const CableTypePlanSchema = z.enum([
  'straight-through',
  'crossover',
  'fiber',
  'serial',
  'console',
  'auto'
]);

export const DeviceTypePlanSchema = z.enum([
  'router',
  'switch',
  'multilayer-switch',
  'pc',
  'server'
]);

export const PortTypeSchema = z.enum([
  'ethernet',
  'serial',
  'fastethernet',
  'gigabitethernet'
]);

export const PortInfoSchema = z.object({
  name: z.string(),
  type: PortTypeSchema,
  available: z.boolean()
});

export const DeviceModelPlanSchema = z.object({
  name: z.string(),
  type: DeviceTypePlanSchema,
  ptType: z.string(),
  ports: z.array(PortInfoSchema)
});

export const PlanPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional()
});

export const InterfacePlanSchema = z.object({
  name: z.string(),
  ip: z.string().optional(),
  subnetMask: z.string().optional(),
  configured: z.boolean(),
  vlan: z.number().optional(),
  description: z.string().optional()
});

export const VLANPlanSchema = z.object({
  id: z.number().min(1).max(4094),
  name: z.string(),
  dhcpPool: z.string().optional(),
  ipRange: z.string().optional()
});

export const DHCPPlanSchema = z.object({
  poolName: z.string(),
  network: z.string(),
  subnetMask: z.string(),
  defaultRouter: z.string(),
  dnsServer: z.string().optional(),
  exclude: z.array(z.string()).optional()
});

export const OSPFAreaPlanSchema = z.object({
  area: z.number(),
  networks: z.array(z.string())
});

export const OSPFPlanConfigSchema = z.object({
  processId: z.number(),
  routerId: z.string().optional(),
  areas: z.array(OSPFAreaPlanSchema),
  defaultRoute: z.boolean().optional()
});

export const EIGRPPlanConfigSchema = z.object({
  asNumber: z.number(),
  networks: z.array(z.string()),
  defaultRoute: z.boolean().optional()
});

export const StaticRoutePlanSchema = z.object({
  network: z.string(),
  mask: z.string(),
  nextHop: z.string()
});

export const RoutingPlanSchema = z.object({
  protocol: RoutingProtocolSchema,
  ospf: OSPFPlanConfigSchema.optional(),
  eigrp: EIGRPPlanConfigSchema.optional(),
  static: z.array(StaticRoutePlanSchema).optional()
});

export const CredentialsPlanSchema = z.object({
  username: z.string(),
  password: z.string(),
  enablePassword: z.string().optional()
});

export const DevicePlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: DeviceModelPlanSchema,
  position: PlanPositionSchema,
  interfaces: z.array(InterfacePlanSchema),
  vlans: z.array(VLANPlanSchema).optional(),
  dhcp: z.array(DHCPPlanSchema).optional(),
  routing: RoutingPlanSchema.optional(),
  credentials: CredentialsPlanSchema.optional()
});

export const LinkEndpointSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  port: z.string()
});

export const LinkPlanSchema = z.object({
  id: z.string(),
  from: LinkEndpointSchema,
  to: LinkEndpointSchema,
  cableType: CableTypePlanSchema,
  validated: z.boolean(),
  errors: z.array(z.string()).optional()
});

export const ValidationErrorTypeSchema = z.enum([
  'invalid_model',
  'invalid_port',
  'invalid_cable',
  'ip_conflict',
  'duplicate_name',
  'missing_ip',
  'invalid_subnet',
  'port_unavailable',
  'vlan_mismatch',
  'routing_conflict'
]);

export const ValidationWarningTypeSchema = z.enum([
  'suboptimal_cable',
  'unused_port',
  'unused_vlan',
  'recommendation'
]);

export const ValidationErrorSchema = z.object({
  type: ValidationErrorTypeSchema,
  message: z.string(),
  affected: z.string().optional(),
  severity: z.enum(['error', 'critical'])
});

export const ValidationWarningSchema = z.object({
  type: ValidationWarningTypeSchema,
  message: z.string(),
  affected: z.string().optional()
});

export const FixActionSchema = z.object({
  type: z.enum(['replace_ip', 'change_cable', 'use_alternative_port', 'add_route']),
  from: z.unknown(),
  to: z.unknown()
});

export const FixSuggestionSchema = z.object({
  description: z.string(),
  action: FixActionSchema,
  autoFixable: z.boolean()
});

export const TopologyPlanValidationSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema),
  suggestions: z.array(FixSuggestionSchema).optional()
});

export const TopologyPlanParamsSchema = z.object({
  routerCount: z.number().min(0),
  switchCount: z.number().min(0),
  pcCount: z.number().min(0),
  serverCount: z.number().optional(),
  networkType: NetworkTypeSchema,
  routingProtocol: RoutingProtocolSchema.optional(),
  dhcpEnabled: z.boolean().optional(),
  vlans: z.array(z.number()).optional(),
  baseNetwork: z.string().optional(),
  subnetMask: z.string().optional()
});

export const TopologyPlanMetadataSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  generatorVersion: z.string().optional(),
  generatedBy: z.string().optional()
});

export const TopologyPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  devices: z.array(DevicePlanSchema),
  links: z.array(LinkPlanSchema),
  params: TopologyPlanParamsSchema,
  validation: TopologyPlanValidationSchema.optional(),
  metadata: TopologyPlanMetadataSchema.optional()
});

export const ToolInputSchemaSchema: z.ZodType<{
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  description?: string;
  enum?: readonly string[];
  default?: unknown;
}> = z.object({
  type: z.enum(['object', 'array', 'string', 'number', 'boolean', 'null']),
  properties: z.record(z.string(), z.any()).optional(),
  required: z.array(z.string()).optional(),
  items: z.any().optional(),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
  default: z.any().optional()
});

export const ToolExampleSchema = z.object({
  description: z.string(),
  input: z.record(z.string(), z.unknown()),
  output: z.any().optional()
});

export const ToolConfigDefinitionSchema = z.object({
  timeout: z.number().optional(),
  requiresBridge: z.boolean().optional(),
  experimental: z.boolean().optional(),
  version: z.string().optional()
});

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  longDescription: z.string().optional(),
  inputSchema: ToolInputSchemaSchema,
  handler: z.any(),
  category: ToolCategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  examples: z.array(ToolExampleSchema).optional(),
  config: ToolConfigDefinitionSchema.optional()
});

export const ToolErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
  cause: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  stack: z.string().optional()
});

export const ToolResultMetadataSchema = z.object({
  duration: z.number().optional(),
  itemCount: z.number().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  warnings: z.array(z.string()).optional(),
  extras: z.record(z.string(), z.unknown()).optional()
});

export const ToolResultSuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  metadata: ToolResultMetadataSchema.optional()
});

export const ToolResultErrorSchema = z.object({
  success: z.literal(false),
  error: ToolErrorSchema
});

export const ToolResultSchema = z.union([
  ToolResultSuccessSchema,
  ToolResultErrorSchema
]);

export type ToolCategory = z.infer<typeof ToolCategorySchema>;
export type NetworkType = z.infer<typeof NetworkTypeSchema>;
export type RoutingProtocol = z.infer<typeof RoutingProtocolSchema>;
export type CableTypePlan = z.infer<typeof CableTypePlanSchema>;
export type DeviceTypePlan = z.infer<typeof DeviceTypePlanSchema>;
export type PortType = z.infer<typeof PortTypeSchema>;
export type PortInfo = z.infer<typeof PortInfoSchema>;
export type DeviceModelPlan = z.infer<typeof DeviceModelPlanSchema>;
export type PlanPosition = z.infer<typeof PlanPositionSchema>;
export type InterfacePlan = z.infer<typeof InterfacePlanSchema>;
export type VLANPlan = z.infer<typeof VLANPlanSchema>;
export type DHCPPlan = z.infer<typeof DHCPPlanSchema>;
export type OSPFAreaPlan = z.infer<typeof OSPFAreaPlanSchema>;
export type OSPFPlanConfig = z.infer<typeof OSPFPlanConfigSchema>;
export type EIGRPPlanConfig = z.infer<typeof EIGRPPlanConfigSchema>;
export type StaticRoutePlan = z.infer<typeof StaticRoutePlanSchema>;
export type RoutingPlan = z.infer<typeof RoutingPlanSchema>;
export type CredentialsPlan = z.infer<typeof CredentialsPlanSchema>;
export type DevicePlan = z.infer<typeof DevicePlanSchema>;
export type LinkEndpoint = z.infer<typeof LinkEndpointSchema>;
export type LinkPlan = z.infer<typeof LinkPlanSchema>;
export type ValidationErrorType = z.infer<typeof ValidationErrorTypeSchema>;
export type ValidationWarningType = z.infer<typeof ValidationWarningTypeSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>;
export type FixAction = z.infer<typeof FixActionSchema>;
export type FixSuggestion = z.infer<typeof FixSuggestionSchema>;
export type TopologyPlanValidation = z.infer<typeof TopologyPlanValidationSchema>;
export type TopologyPlanParams = z.infer<typeof TopologyPlanParamsSchema>;
export type TopologyPlanMetadata = z.infer<typeof TopologyPlanMetadataSchema>;
export type TopologyPlan = z.infer<typeof TopologyPlanSchema>;
export type ToolInputSchema = z.infer<typeof ToolInputSchemaSchema>;
export type ToolExample = z.infer<typeof ToolExampleSchema>;
export type ToolConfigDefinition = z.infer<typeof ToolConfigDefinitionSchema>;
export type ToolError = z.infer<typeof ToolErrorSchema>;
export type ToolResultMetadata = z.infer<typeof ToolResultMetadataSchema>;
export type ToolResultSuccess = z.infer<typeof ToolResultSuccessSchema>;
export type ToolResultError = z.infer<typeof ToolResultErrorSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
