// ============================================================================
// CableMedia Value Object
// ============================================================================

/**
 * Cable media types derived from CableType
 */
export type CableMediaType = 'copper' | 'fiber' | 'wireless' | 'coaxial' | 'serial' | 'usb' | 'unknown';

/**
 * Mapping from CableType to CableMediaType
 */
const CABLE_TYPE_TO_MEDIA: Record<string, CableMediaType> = {
  // Copper
  'straight': 'copper',
  'cross': 'copper',
  'roll': 'copper',
  'console': 'copper',
  'phone': 'copper',
  'cable': 'copper',
  'octal': 'copper',
  
  // Fiber
  'fiber': 'fiber',
  
  // Wireless
  'wireless': 'wireless',
  'cellular': 'wireless',
  
  // Coaxial
  'coaxial': 'coaxial',
  
  // Serial
  'serial': 'serial',
  
  // USB
  'usb': 'usb',
  
  // Auto/Unknown
  'auto': 'unknown',
  'custom_io': 'unknown',
};

/**
 * Valor obstructor que representa el tipo de medio físico de un cable/conexión.
 *
 * Deriva de CableType pero provee una categorización más simple para
 * análisis de topología y validación.
 *
 * @example
 * ```typescript
 * const media = CableMedia.fromCableType("fiber");
 * console.log(media.isFiber); // true
 * console.log(media.typicalMaxDistance); // 2000
 * console.log(media.typicalSpeed); // 10000
 * ```
 */
export class CableMedia {
  public readonly value: CableMediaType;

  constructor(value: CableMediaType) {
    const validMedia: CableMediaType[] = ['copper', 'fiber', 'wireless', 'coaxial', 'serial', 'usb', 'unknown'];
    
    if (!validMedia.includes(value)) {
      throw new Error(
        `Invalid cable media "${value}". Must be one of: ${validMedia.join(', ')}`
      );
    }
    
    this.value = value;
  }

  /**
   * Create CableMedia from a CableType string
   */
  static fromCableType(cableType: string): CableMedia {
    const normalized = cableType.toLowerCase().trim();
    
    if (normalized.length === 0) {
      throw new Error('Cable type cannot be empty');
    }
    
    const media = CABLE_TYPE_TO_MEDIA[normalized] || 'unknown';
    return new CableMedia(media);
  }

  /**
   * Create CableMedia from media type string
   */
  static from(media: CableMediaType): CableMedia {
    return new CableMedia(media);
  }

  /**
   * Try to create from CableType, returns null if invalid
   */
  static tryFromCableType(cableType: string): CableMedia | null {
    try {
      return CableMedia.fromCableType(cableType);
    } catch {
      return null;
    }
  }

  /**
   * Try to create from media type, returns null if invalid
   */
  static tryFrom(media: string): CableMedia | null {
    try {
      return new CableMedia(media as CableMediaType);
    } catch {
      return null;
    }
  }

  /**
   * Check if a CableType string is valid
   */
  static isValidCableType(cableType: string): boolean {
    try {
      CableMedia.fromCableType(cableType);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a media type string is valid
   */
  static isValid(media: string): boolean {
    try {
      new CableMedia(media as CableMediaType);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if this is copper media
   */
  get isCopper(): boolean {
    return this.value === 'copper';
  }

  /**
   * Check if this is fiber media
   */
  get isFiber(): boolean {
    return this.value === 'fiber';
  }

  /**
   * Check if this is wireless media
   */
  get isWireless(): boolean {
    return this.value === 'wireless';
  }

  /**
   * Check if this is coaxial media
   */
  get isCoaxial(): boolean {
    return this.value === 'coaxial';
  }

  /**
   * Check if this is serial media
   */
  get isSerial(): boolean {
    return this.value === 'serial';
  }

  /**
   * Check if this is USB media
   */
  get isUsb(): boolean {
    return this.value === 'usb';
  }

  /**
   * Check if this media requires physical connection (not wireless)
   */
  get isPhysical(): boolean {
    return this.value !== 'wireless';
  }

  /**
   * Get typical max distance for this media type (in meters)
   */
  get typicalMaxDistance(): number | null {
    switch (this.value) {
      case 'copper':
        return 100; // Ethernet copper (Cat5e/6)
      case 'fiber':
        return 2000; // Multi-mode fiber (varies widely)
      case 'wireless':
        return 100; // 802.11 typical indoor
      case 'coaxial':
        return 500; // Coaxial cable
      case 'serial':
        return 15; // RS-232
      case 'usb':
        return 5; // USB 2.0/3.0
      default:
        return null;
    }
  }

  /**
   * Get typical speed for this media type (in Mbps)
   */
  get typicalSpeed(): number | null {
    switch (this.value) {
      case 'copper':
        return 1000; // Gigabit Ethernet
      case 'fiber':
        return 10000; // 10 Gigabit fiber
      case 'wireless':
        return 300; // 802.11n typical
      case 'coaxial':
        return 10; // Legacy coaxial Ethernet
      case 'serial':
        return 1; // Serial typical
      case 'usb':
        return 480; // USB 2.0
      default:
        return null;
    }
  }

  /**
   * Check equality with another CableMedia
   */
  equals(other: CableMedia): boolean {
    return this.value === other.value;
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
  toJSON(): CableMediaType {
    return this.value;
  }
}

/**
 * Parse cable media from CableType
 */
export function parseCableMediaFromType(cableType: string): CableMedia {
  return CableMedia.fromCableType(cableType);
}

/**
 * Parse cable media from media type string
 */
export function parseCableMedia(media: CableMediaType): CableMedia {
  return CableMedia.from(media);
}

/**
 * Check if a CableType is valid
 */
export function isValidCableType(cableType: string): boolean {
  return CableMedia.isValidCableType(cableType);
}
