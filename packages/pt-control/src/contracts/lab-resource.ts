import { z } from 'zod';

export const LabResourceTypeSchema = z.enum([
  'device',
  'link',
  'vlan',
  'trunk',
  'access-port',
  'svi',
  'static-route',
  'dhcp-pool',
  'host',
  'service',
]);
export type LabResourceType = z.infer<typeof LabResourceTypeSchema>;

export const LabResourceSchema = z.object({
  type: LabResourceTypeSchema,
  id: z.string(),
  device: z.string().optional(),
  details: z.record(z.string(), z.any()),
});
export type LabResource = z.infer<typeof LabResourceSchema>;
