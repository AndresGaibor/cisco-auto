import { z } from 'zod';
import { ZoneKindSchema, SpatialRelationSchema, InferenceSourceSchema } from './twin-enums.js';

export const ZoneMembershipRuleSchema = z.object({
  mode: z.enum(['center-inside', 'bbox-overlap', 'majority-area']).default('center-inside'),
  threshold: z.number().min(0).max(1).optional(),
});
export type ZoneMembershipRule = z.infer<typeof ZoneMembershipRuleSchema>;

export const ZoneSemanticsSchema = z.object({
  vlanId: z.number().optional(),
  vlanName: z.string().optional(),
  role: z.string().optional(),
  subnet: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type ZoneSemantics = z.infer<typeof ZoneSemanticsSchema>;

export const ZoneStyleSchema = z.object({
  fillColor: z.string().optional(),
  borderColor: z.string().optional(),
  textColor: z.string().optional(),
});
export type ZoneStyle = z.infer<typeof ZoneStyleSchema>;

export const ZoneGeometrySchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});
export type ZoneGeometry = z.infer<typeof ZoneGeometrySchema>;

export const ZoneTwinSchema = z.object({
  id: z.string(),
  kind: ZoneKindSchema.default('rectangle'),
  label: z.string().optional(),
  geometry: ZoneGeometrySchema,
  style: ZoneStyleSchema.optional(),
  semantics: ZoneSemanticsSchema.optional(),
  membershipRule: ZoneMembershipRuleSchema.default({ mode: 'center-inside' }),
});
export type ZoneTwin = z.infer<typeof ZoneTwinSchema>;

export const AnnotationSemanticsSchema = z.object({
  vlanId: z.number().optional(),
  role: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type AnnotationSemantics = z.infer<typeof AnnotationSemanticsSchema>;

export const AnnotationTwinSchema = z.object({
  id: z.string(),
  kind: z.enum(['note', 'label']).default('label'),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
  semantics: AnnotationSemanticsSchema.optional(),
});
export type AnnotationTwin = z.infer<typeof AnnotationTwinSchema>;

export const DeviceZoneMembershipSchema = z.object({
  zoneId: z.string(),
  relation: SpatialRelationSchema.default('inside'),
  confidence: z.number().min(0).max(1).default(1),
});
export type DeviceZoneMembership = z.infer<typeof DeviceZoneMembershipSchema>;

export const DeviceInferenceSchema = z.object({
  vlanId: z.number().optional(),
  role: z.string().optional(),
  source: InferenceSourceSchema,
  confidence: z.number().min(0).max(1).default(0.5),
});
export type DeviceInference = z.infer<typeof DeviceInferenceSchema>;

export const DeviceSpatialContextSchema = z.object({
  logicalPosition: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    centerX: z.number(),
    centerY: z.number(),
  }),
  zones: z.array(DeviceZoneMembershipSchema).default([]),
  inferred: DeviceInferenceSchema.optional(),
});
export type DeviceSpatialContext = z.infer<typeof DeviceSpatialContextSchema>;

export const ZoneSemanticRuleSchema = z.object({
  color: z.string().optional(),
  labelPattern: z.string().optional(),
  vlanId: z.number().optional(),
  role: z.string().optional(),
  priority: z.number().default(0),
});
export type ZoneSemanticRule = z.infer<typeof ZoneSemanticRuleSchema>;

export const DEFAULT_ZONE_RULES: ZoneSemanticRule[] = [
  { color: '#0000FF', vlanId: 10, role: 'usuarios', priority: 1 },
  { color: '#0000ff', vlanId: 10, role: 'usuarios', priority: 1 },
  { color: '#FF00FF', vlanId: 20, role: 'usuarios', priority: 1 },
  { color: '#ff00ff', vlanId: 20, role: 'usuarios', priority: 1 },
  { color: '#FFFF00', vlanId: 30, role: 'usuarios', priority: 1 },
  { color: '#ffff00', vlanId: 30, role: 'usuarios', priority: 1 },
  { color: '#00FF00', vlanId: 40, role: 'usuarios', priority: 1 },
  { color: '#00ff00', vlanId: 40, role: 'usuarios', priority: 1 },
  { color: '#FFA500', vlanId: 50, role: 'servidores', priority: 1 },
  { color: '#ffa500', vlanId: 50, role: 'servidores', priority: 1 },
];
