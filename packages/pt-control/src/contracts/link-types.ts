import { z } from 'zod';
import { PortMediaSchema } from './twin-enums.js';

export const LinkTwinSchema = z.object({
  id: z.string(),
  device1: z.string(),
  port1: z.string(),
  device2: z.string(),
  port2: z.string(),
  cableType: z.string(),
  cableMedia: PortMediaSchema.optional(),
  connected: z.boolean().default(true),
});
export type LinkTwin = z.infer<typeof LinkTwinSchema>;
