import { z } from 'zod';

export const AgentBaseContextSchema = z.object({
  lab: z.object({
    name: z.string().optional(),
    deviceCount: z.number(),
    linkCount: z.number(),
    zoneCount: z.number(),
    lastUpdatedAt: z.number(),
  }),
  topology: z.object({
    coreDevices: z.array(z.string()).default([]),
    accessDevices: z.array(z.string()).default([]),
    serverDevices: z.array(z.string()).default([]),
    edgeDevices: z.array(z.string()).default([]),
  }),
  selection: z.object({
    selectedDevice: z.string().optional(),
    selectedZone: z.string().optional(),
    focusDevices: z.array(z.string()).default([]),
  }).optional(),
  task: z.object({
    goal: z.string(),
    scope: z.enum(['global', 'device', 'zone', 'task']).default('task'),
    affectedDevices: z.array(z.string()).default([]),
    affectedZones: z.array(z.string()).default([]),
    suggestedCommands: z.array(z.string()).default([]),
    notes: z.array(z.string()).default([]),
  }).optional(),
  zones: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    color: z.string().optional(),
    inferredVlanId: z.number().optional(),
    deviceCount: z.number(),
  })).default([]),
  alerts: z.array(z.string()).default([]),
  recentChanges: z.array(z.object({
    type: z.string(),
    target: z.string(),
    ts: z.number(),
  })).default([]),
});
export type AgentBaseContext = z.infer<typeof AgentBaseContextSchema>;

export const AgentSessionStateSchema = z.object({
  selectedDevice: z.string().optional(),
  selectedZone: z.string().optional(),
  focusDevices: z.array(z.string()).default([]),
  lastTask: z.string().optional(),
  lastPlan: z.array(z.string()).optional(),
  verbosity: z.enum(['compact', 'normal', 'detailed']).default('normal'),
});
export type AgentSessionState = z.infer<typeof AgentSessionStateSchema>;
