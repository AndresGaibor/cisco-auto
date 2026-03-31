// ============================================================================
// Intent Parser - Natural Language to Structured Mutations
// ============================================================================

import type { NetworkTwin } from "../contracts/twin-types.js";
import type { CommandPlan } from "../domain/ios/operations/command-plan.js";

// ============================================================================
// Intent Kinds
// ============================================================================

/**
 * Supported intent kinds for mutation operations
 */
export type IntentKind =
  | "configure-access-port"
  | "configure-trunk-port"
  | "configure-static-route"
  | "configure-svi"
  | "configure-vlan"
  | "configure-dhcp-pool"
  | "configure-dhcp-relay"
  | "configure-subinterface"
  | "unknown";

// ============================================================================
// Intent Patterns
// ============================================================================

/**
 * A registered intent pattern with metadata
 */
export interface IntentPattern {
  /** Unique pattern identifier */
  id: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Human-readable description */
  description: string;
  /** The intent kind this pattern produces */
  kind: IntentKind;
  /** Names of captured groups (in order) */
  paramNames: string[];
  /** Example usage */
  example: string;
}

// ============================================================================
// Parsed Intent
// ============================================================================

/**
 * Result of parsing a natural language intent
 */
export interface ParsedIntent {
  /** The original text that was parsed */
  rawText: string;
  /** The matched intent kind */
  kind: IntentKind;
  /** Matched pattern ID */
  patternId: string;
  /** Extracted parameters from the text */
  params: Record<string, string>;
  /** Confidence score (0-1) */
  confidence: number;
  /** Device target (if identified) */
  device?: string;
  /** Error message if parsing failed */
  error?: string;
}

// ============================================================================
// Match Result
// ============================================================================

/**
 * Result of matching text against patterns
 */
export interface MatchResult {
  /** Whether a match was found */
  matched: boolean;
  /** The matched pattern (if any) */
  pattern?: IntentPattern;
  /** Extracted parameters */
  params: Record<string, string>;
  /** Confidence score (0-1) */
  confidence: number;
  /** Device target (if identified) */
  device?: string;
}

// ============================================================================
// Intent Parser
// ============================================================================

/**
 * Parses natural language into structured intent mutations
 */
export class IntentParser {
  private patterns: IntentPattern[] = [];

  constructor(patterns?: IntentPattern[]) {
    if (patterns) {
      this.patterns = patterns;
    }
  }

  /**
   * Register a new intent pattern
   */
  register(pattern: IntentPattern): void {
    // Check for duplicate ID
    const existing = this.patterns.find((p) => p.id === pattern.id);
    if (existing) {
      throw new Error(`Pattern with ID "${pattern.id}" already registered`);
    }
    this.patterns.push(pattern);
  }

  /**
   * Register multiple patterns at once
   */
  registerAll(patterns: IntentPattern[]): void {
    for (const pattern of patterns) {
      this.register(pattern);
    }
  }

  /**
   * Parse natural language text into a structured intent
   */
  parse(text: string): ParsedIntent | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const result = this.match(trimmed, this.patterns);

    if (!result.matched || !result.pattern) {
      return {
        rawText: text,
        kind: "unknown",
        patternId: "",
        params: {},
        confidence: 0,
        error: "No matching intent pattern found",
      };
    }

    return {
      rawText: text,
      kind: result.pattern.kind,
      patternId: result.pattern.id,
      params: result.params,
      confidence: result.confidence,
      device: result.device,
    };
  }

  /**
   * Match text against a set of patterns
   */
  match(text: string, patterns: IntentPattern[]): MatchResult {
    // Sort by specificity (longer patterns first)
    const sorted = [...patterns].sort(
      (a, b) => b.pattern.source.length - a.pattern.source.length
    );

    for (const pattern of sorted) {
      const match = pattern.pattern.exec(text);
      if (match) {
        // Build params object from named groups or positional
        const params: Record<string, string> = {};
        const groups = match.groups || {};

        // Use named groups if available
        if (Object.keys(groups).length > 0) {
          for (const [key, value] of Object.entries(groups)) {
            if (value !== undefined) {
              params[key] = value.trim();
            }
          }
        } else {
          // Fall back to positional (skip full match at index 0)
          for (let i = 1; i < match.length; i++) {
            const paramName = pattern.paramNames[i - 1] || `param${i}`;
            params[paramName] = (match[i] || "").trim();
          }
        }

        // Try to extract device from common locations
        const device = this.extractDevice(text, params);

        return {
          matched: true,
          pattern,
          params,
          confidence: this.calculateConfidence(match, text),
          device,
        };
      }
    }

    return {
      matched: false,
      params: {},
      confidence: 0,
    };
  }

  /**
   * Extract device name from text or params
   */
  private extractDevice(text: string, params: Record<string, string>): string | undefined {
    // Check for explicit "on <device>" or "at <device>"
    const deviceMatch = text.match(/(?:on|at|device[:\s]+)(\S+)/i);
    if (deviceMatch) {
      return deviceMatch[1];
    }

    // Check params for device
    if (params.device) {
      return params.device;
    }

    return undefined;
  }

  /**
   * Calculate confidence score based on match quality
   */
  private calculateConfidence(match: RegExpExecArray, text: string): number {
    let confidence = 0.5; // Base confidence

    // Boost for full match vs partial
    if (match[0].length === text.length) {
      confidence += 0.3;
    } else {
      // Partial match - ratio of matched to total
      confidence += (match[0].length / text.length) * 0.3;
    }

    // Boost for having all expected params
    if (match.length > 1) {
      confidence += 0.2;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): IntentPattern[] {
    return [...this.patterns];
  }

  /**
   * Clear all registered patterns
   */
  clear(): void {
    this.patterns = [];
  }
}

// ============================================================================
// Built-in Patterns Factory
// ============================================================================

/**
 * Create the default set of intent patterns for Cisco IOS
 */
export function createDefaultPatterns(): IntentPattern[] {
  return [
    // Configure Access Port
    {
      id: "configure-access-port",
      pattern:
        /(?:configure|set|make|config(?:ure)?)\s+(?:an?\s+)?(?:access\s+)?port\s+(?:on\s+)?(?<port>\S+)(?:\s+(?:in\s+)?vlan?\s+(?<vlan>\d+))?(?:\s+description\s+["'](?<description>[^"']+)["'])?/i,
      description: "Configure an access port with VLAN assignment",
      kind: "configure-access-port",
      paramNames: ["port", "vlan", "description"],
      example:
        "configure access port GigabitEthernet0/1 in vlan 10 description Staff",
    },

    // Trunk Port
    {
      id: "configure-trunk-port",
      pattern:
        /(?:configure|set|make|config(?:ure)?)\s+(?:a\s+)?trunk\s+port\s+(?:on\s+)?(?<port>\S+)(?:\s+(?:allow(?:ing)?|native)\s+vlan[s]?\s+(?<vlans>[^\s]+))?/i,
      description: "Configure a trunk port with VLAN settings",
      kind: "configure-trunk-port",
      paramNames: ["port", "vlans"],
      example: "configure trunk port GigabitEthernet0/1 allowing vlan 10,20,30",
    },

    // Add Static Route
    {
      id: "add-static-route",
      pattern:
        /(?:add|create|configure)\s+(?:a\s+)?static\s+route\s+(?:to\s+)?(?<network>\d+\.\d+\.\d+\.\d+)\/(?<mask>\d+)(?:\s+via\s+(?:next\s+hop\s+)?(?<nexthop>\d+\.\d+\.\d+\.\d+))?/i,
      description: "Add a static route",
      kind: "configure-static-route",
      paramNames: ["network", "mask", "nexthop"],
      example: "add static route to 192.168.1.0/24 via 10.0.0.1",
    },

    // Assign IP to Interface
    {
      id: "assign-ip",
      pattern:
        /(?:assign|set|configure)\s+(?:an?\s+)?ip\s+(?:address\s+)?(?<ip>\d+\.\d+\.\d+\.\d+)\/(?<mask>\d+)\s+(?:to\s+)?(?:interface\s+)?(?<port>\S+)/i,
      description: "Assign an IP address to an interface",
      kind: "configure-svi",
      paramNames: ["ip", "mask", "port"],
      example: "assign ip 192.168.1.1/24 to GigabitEthernet0/0",
    },

    // Create VLAN
    {
      id: "create-vlan",
      pattern:
        /(?:create|add|configure)\s+(?:a\s+)?vlan?\s+(?<vlan>\d+)(?:\s+(?:named?\s+)?["']?(?<name>[^"'\s]+)["']?)?/i,
      description: "Create a new VLAN",
      kind: "configure-vlan",
      paramNames: ["vlan", "name"],
      example: "create vlan 100 named Servers",
    },

    // Configure SVI
    {
      id: "configure-svi",
      pattern:
        /(?:configure|create|set\s+up)\s+(?:an?\s+)?svi(?:\s+for\s+vlan?\s+(?<vlan>\d+))?(?:\s+ip\s+(?<ip>\d+\.\d+\.\d+\.\d+)\/(?<mask>\d+))?/i,
      description: "Configure a Switch Virtual Interface",
      kind: "configure-svi",
      paramNames: ["vlan", "ip", "mask"],
      example: "configure svi for vlan 10 ip 192.168.10.1/24",
    },

    // DHCP Pool
    {
      id: "create-dhcp-pool",
      pattern:
        /(?:create|configure|add)\s+(?:a\s+)?dhcp\s+pool\s+(?:named?\s+)?["']?(?<poolname>\w+)["']?(?:\s+(?:for|network)\s+(?<network>\d+\.\d+\.\d+\.\d+)\/(?<mask>\d+))?(?:\s+(?:gateway|router)\s+(?<gateway>\d+\.\d+\.\d+\.\d+))?/i,
      description: "Create a DHCP pool",
      kind: "configure-dhcp-pool",
      paramNames: ["poolname", "network", "mask", "gateway"],
      example:
        "create dhcp pool DHCP_POOL for 192.168.1.0/24 gateway 192.168.1.1",
    },

    // Enable Routing
    {
      id: "enable-routing",
      pattern:
        /(?:enable|turn\s+on)\s+(?:ip\s+)?routing(?:\s+on\s+(?<device>\S+))?/i,
      description: "Enable IP routing on a device",
      kind: "configure-svi",
      paramNames: ["device"],
      example: "enable ip routing",
    },

    // Shutdown Port
    {
      id: "shutdown-port",
      pattern:
        /(?:shutdown|disable)\s+(?:port\s+)?(?<port>\S+)(?:\s+on\s+(?<device>\S+))?/i,
      description: "Shutdown a port",
      kind: "configure-access-port",
      paramNames: ["port", "device"],
      example: "shutdown GigabitEthernet0/1",
    },

    // No Shutdown Port
    {
      id: "no-shutdown-port",
      pattern:
        /(?:no\s+shutdown|enable)\s+(?:port\s+)?(?<port>\S+)(?:\s+on\s+(?<device>\S+))?/i,
      description: "Enable a port (no shutdown)",
      kind: "configure-access-port",
      paramNames: ["port", "device"],
      example: "no shutdown GigabitEthernet0/1",
    },
  ];
}
