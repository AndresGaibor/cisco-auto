import { z } from 'zod';

export const LogicalPlacementSchema = z.object({
  x: z.number(),
  y: z.number(),
  centerX: z.number(),
  centerY: z.number(),
  areaTopY: z.number().optional(),
  areaLeftX: z.number().optional(),
  zoneIds: z.array(z.string()).optional(),
});
export type LogicalPlacement = z.infer<typeof LogicalPlacementSchema>;

export const PhysicalPlacementSchema = z.object({
  x: z.number(),
  y: z.number(),
  globalX: z.number().optional(),
  globalY: z.number().optional(),
  containerPath: z.array(z.string()).optional(),
  containerUuidPath: z.array(z.string()).optional(),
  physicalObjectType: z.string().optional(),
});
export type PhysicalPlacement = z.infer<typeof PhysicalPlacementSchema>;

export const LayoutRelationSchema = z.enum(['left-of', 'right-of', 'above', 'below', 'align-horizontal', 'align-vertical', 'grid', 'stack']);
export type LayoutRelation = z.infer<typeof LayoutRelationSchema>;

export const LayoutSuggestionSchema = z.object({
  device: z.string(),
  x: z.number(),
  y: z.number(),
  relation: LayoutRelationSchema.optional(),
  anchor: z.string().optional(),
  zoneIds: z.array(z.string()).default([]),
  reasoning: z.array(z.string()).default([]),
});
export type LayoutSuggestion = z.infer<typeof LayoutSuggestionSchema>;

export const LayoutPlanSchema = z.object({
  suggestions: z.array(LayoutSuggestionSchema).default([]),
  warnings: z.array(z.string()).default([]),
});
export type LayoutPlan = z.infer<typeof LayoutPlanSchema>;
