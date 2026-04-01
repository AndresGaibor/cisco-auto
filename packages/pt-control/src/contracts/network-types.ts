import { z } from 'zod';
import { PortMediaSchema } from './twin-enums.js';
import { DeviceTwinSchema } from './device-types.js';
import { LinkTwinSchema } from './link-types.js';
import { ZoneTwinSchema } from './spatial-types.js';
import { AnnotationTwinSchema } from './spatial-types.js';

export const TwinIndexesSchema = z.object({
  byDeviceName: z.record(z.string(), z.any()).optional(),
  byModel: z.record(z.string(), z.array(z.string())).optional(),
  byPortRef: z.record(z.string(), z.any()).optional(),
  byZoneId: z.record(z.string(), z.array(z.string())).optional(),
  byPhysicalPath: z.record(z.string(), z.array(z.string())).optional(),
  byIp: z.record(z.string(), z.any()).optional(),
  byMac: z.record(z.string(), z.any()).optional(),
});
export type TwinIndexes = z.infer<typeof TwinIndexesSchema>;

export const NetworkTwinMetadataSchema = z.object({
  version: z.number().default(1),
  updatedAt: z.number(),
  createdAt: z.number().optional(),
});
export type NetworkTwinMetadata = z.infer<typeof NetworkTwinMetadataSchema>;

export const NetworkTwinSchema = z.object({
  devices: z.record(z.string(), DeviceTwinSchema).default({}),
  links: z.record(z.string(), LinkTwinSchema).default({}),
  zones: z.record(z.string(), ZoneTwinSchema).default({}),
  annotations: z.record(z.string(), AnnotationTwinSchema).default({}),
  indexes: TwinIndexesSchema.optional(),
  metadata: NetworkTwinMetadataSchema,
});
export type NetworkTwin = z.infer<typeof NetworkTwinSchema>;
