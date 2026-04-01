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
