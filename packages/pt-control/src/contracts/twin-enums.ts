/**
 * TWIN TYPES - ENUM DEFINITIONS
 * 
 * Enums compartidos para los tipos de NetworkTwin
 */

import { z } from 'zod';

export const DeviceFamilySchema = z.enum([
  'router',
  'switch-l2',
  'switch-l3',
  'server',
  'asa',
  'wlc',
  'ap',
  'pc',
  'iot',
  'unknown',
]);
export type DeviceFamily = z.infer<typeof DeviceFamilySchema>;

export const PortKindSchema = z.enum(['ethernet', 'serial', 'usb', 'wireless', 'fiber', 'unknown']);
export type PortKind = z.infer<typeof PortKindSchema>;

export const PortMediaSchema = z.enum(['copper', 'fiber', 'coaxial', 'wireless']);
export type PortMedia = z.infer<typeof PortMediaSchema>;

export const VlanModeSchema = z.enum(['access', 'trunk', 'routed']);
export type VlanMode = z.infer<typeof VlanModeSchema>;

export const ZoneKindSchema = z.enum(['rectangle', 'ellipse', 'polygon', 'note']);
export type ZoneKind = z.infer<typeof ZoneKindSchema>;

export const AnnotationKindSchema = z.enum(['note', 'label']);
export type AnnotationKind = z.infer<typeof AnnotationKindSchema>;

export const ProvenanceSourceSchema = z.enum(['pt-api', 'cli-show', 'inferred', 'manual']);
export type ProvenanceSource = z.infer<typeof ProvenanceSourceSchema>;

export const SpatialRelationSchema = z.enum(['inside', 'overlapping', 'near']);
export type SpatialRelation = z.infer<typeof SpatialRelationSchema>;

export const InferenceSourceSchema = z.enum(['zone-color', 'zone-label', 'annotation', 'manual', 'cli-validation']);
export type InferenceSource = z.infer<typeof InferenceSourceSchema>;

export const ModuleCategorySchema = z.enum(['power', 'network', 'interface', 'sfp', 'wireless', 'unknown']);
export type ModuleCategory = z.infer<typeof ModuleCategorySchema>;

// Utility helpers
export function isTrunkMode(mode: VlanMode | undefined): boolean {
  return mode === 'trunk';
}

export function isAccessMode(mode: VlanMode | undefined): boolean {
  return mode === 'access';
}

export function isRoutedMode(mode: VlanMode | undefined): boolean {
  return mode === 'routed';
}

export function isEthernetPortKind(kind: PortKind): boolean {
  return kind === 'ethernet' || kind === 'fiber';
}

export function isSerialPortKind(kind: PortKind): boolean {
  return kind === 'serial';
}
