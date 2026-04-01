/**
 * Topology Plan Types - Types for network topology planning
 * Defines topology plans, parameters, and network configurations
 */

import type { ToolInput } from './tool-core';

// ============================================================================
// Topology Plan Types
// ============================================================================

export interface TopologyPlan {
  id: string;
  name: string;
  description?: string;
  devices: DevicePlanSpec[];
  links: LinkPlanSpec[];
  vlans: VlanPlanSpec[];
  routing?: RoutingPlanSpec;
  security?: SecurityPlanSpec;
  metadata?: Record<string, unknown>;
}

export interface DevicePlanSpec {
  id: string;
  name: string;
  model: string;
  type: string;
  position?: { x: number; y: number };
  configuration?: Record<string, unknown>;
}

export interface LinkPlanSpec {
  id: string;
  source: { device: string; port: string };
  target: { device: string; port: string };
  type?: string;
  speed?: number;
  encapsulation?: string;
}

export interface VlanPlanSpec {
  id: number;
  name: string;
  description?: string;
  subnet?: string;
}

export interface RoutingPlanSpec {
  protocol: 'static' | 'ospf' | 'eigrp' | 'bgp' | 'rip';
  enabled: boolean;
  configuration?: Record<string, unknown>;
}

export interface SecurityPlanSpec {
  acls?: ACLSpec[];
  authentication?: AuthSpec;
  encryption?: EncryptionSpec;
}

export interface ACLSpec {
  id: string;
  name: string;
  type: 'standard' | 'extended';
  rules: ACLRule[];
}

export interface ACLRule {
  action: 'permit' | 'deny';
  protocol: string;
  source: string;
  destination: string;
}

export interface AuthSpec {
  method: 'radius' | 'tacacs' | 'local' | 'none';
  server?: string;
}

export interface EncryptionSpec {
  method: string;
  enabled: boolean;
}

// ============================================================================
// Plan Parameters
// ============================================================================

export interface TopologyPlanParams extends ToolInput {
  name: string;
  description?: string;
  deviceCount: number;
  topology?: 'linear' | 'star' | 'mesh' | 'custom';
  includeRedundancy?: boolean;
  includeRouting?: boolean;
  includeSecurity?: boolean;
}

// ============================================================================
// Network Types
// ============================================================================

export type NetworkType =
  | 'enterprise'
  | 'campus'
  | 'branch'
  | 'datacenter'
  | 'service-provider'
  | 'wan'
  | 'wan-edge'
  | 'lab'
  | 'demo'
  | 'custom';

// ============================================================================
// Topology Validation
// ============================================================================

export interface TopologyValidationResult {
  valid: boolean;
  errors: TopologyError[];
  warnings: TopologyWarning[];
}

export interface TopologyError {
  code: string;
  message: string;
  path: string;
}

export interface TopologyWarning {
  code: string;
  message: string;
  path: string;
  severity: 'low' | 'medium' | 'high';
}
