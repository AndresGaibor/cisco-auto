// ============================================================================
// ColorHex Value Object
// ============================================================================

/**
 * Represents a validated hex color code
 * 
 * Supports formats:
 * - #RGB (3 digits)
 * - #RRGGBB (6 digits)
 * - #RRGGBBAA (8 digits with alpha)
 */
const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/**
 * Common color mappings for PT zones
 */
const PT_ZONE_COLORS: Record<string, number> = {
  '#0000ff': 10,  // Blue -> VLAN 10
  '#0000FF': 10,
  '#ff00ff': 20,  // Magenta -> VLAN 20
  '#FF00FF': 20,
  '#ffff00': 30,  // Yellow -> VLAN 30
  '#FFFF00': 30,
  '#00ff00': 40,  // Green -> VLAN 40
  '#00FF00': 40,
  '#ffa500': 50,  // Orange -> VLAN 50
  '#FFA500': 50,
};

export class ColorHex {
  public readonly value: string;
  public readonly normalized: string;

  constructor(value: string) {
    const trimmed = value.trim();
    
    if (!HEX_COLOR_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid hex color: "${value}". Must be in format #RGB, #RRGGBB, or #RRGGBBAA`
      );
    }

    this.value = trimmed;
    this.normalized = trimmed.toLowerCase();
  }

  /**
   * Create ColorHex from hex string
   */
  static from(value: string): ColorHex {
    return new ColorHex(value);
  }

  /**
   * Try to create ColorHex, returns null if invalid
   */
  static tryFrom(value: string): ColorHex | null {
    try {
      return new ColorHex(value);
    } catch {
      return null;
    }
  }

  /**
   * Check if a string is a valid hex color
   */
  static isValid(value: string): boolean {
    try {
      new ColorHex(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create from RGB values (0-255)
   */
  static fromRGB(r: number, g: number, b: number, a?: number): ColorHex {
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      throw new Error('RGB values must be between 0 and 255');
    }
    
    const hex = `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}` +
                (a !== undefined ? a.toString(16).padStart(2, '0') : '');
    return new ColorHex(hex);
  }

  /**
   * Parse RGB components from hex
   */
  toRGB(): { r: number; g: number; b: number; a?: number } {
    const hex = this.normalized.slice(1);
    
    if (hex.length === 3) {
      const [r, g, b] = hex.split('').map(c => parseInt(c + c, 16));
      return { r: r!, g: g!, b: b! };
    }
    
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
    
    // 8 digits with alpha
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16);
    return { r, g, b, a };
  }

  /**
   * Get inferred VLAN ID from PT zone color
   */
  get inferredVlanId(): number | null {
    return PT_ZONE_COLORS[this.normalized] || null;
  }

  /**
   * Check if this is a known PT zone color
   */
  get isPTZoneColor(): boolean {
    return this.normalized in PT_ZONE_COLORS;
  }

  /**
   * Get brightness (0-1)
   */
  get brightness(): number {
    const { r, g, b } = this.toRGB();
    // Relative luminance formula
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  /**
   * Check if color is light (for determining text color)
   */
  get isLight(): boolean {
    return this.brightness > 0.5;
  }

  /**
   * Check if color is dark (for determining text color)
   */
  get isDark(): boolean {
    return this.brightness <= 0.5;
  }

  /**
   * Get contrasting text color (black or white)
   */
  get contrastingTextColor(): string {
    return this.isLight ? '#000000' : '#FFFFFF';
  }

  /**
   * Check equality with another ColorHex
   */
  equals(other: ColorHex): boolean {
    return this.normalized === other.normalized;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this.normalized;
  }
}

/**
 * Parse a hex color from string
 */
export function parseColorHex(value: string): ColorHex {
  return ColorHex.from(value);
}

/**
 * Parse optional hex color (returns undefined for null/undefined)
 */
export function parseOptionalColorHex(value: string | null | undefined): ColorHex | undefined {
  if (value === null || value === undefined || value.trim() === '') {
    return undefined;
  }
  return ColorHex.from(value);
}

/**
 * Check if a string is a valid hex color
 */
export function isValidColorHex(value: string): boolean {
  return ColorHex.isValid(value);
}

/**
 * Get inferred VLAN ID from a color string
 */
export function inferVlanFromColor(color: string): number | null {
  try {
    return ColorHex.from(color).inferredVlanId;
  } catch {
    return null;
  }
}
