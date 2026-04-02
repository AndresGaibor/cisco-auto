// ============================================================================
// AdministrativeDistance Value Object Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  AdministrativeDistance,
  parseAdministrativeDistance,
  isValidAdministrativeDistance,
  WELL_KNOWN_AD,
} from "@cisco-auto/ios-domain";

describe("AdministrativeDistance", () => {
  describe("constructor", () => {
    it("should create valid AD values", () => {
      const ad = new AdministrativeDistance(90);
      expect(ad.value).toBe(90);
    });

    it("should reject non-integer values", () => {
      expect(() => new AdministrativeDistance(90.5)).toThrow("must be an integer");
    });

    it("should reject values below 0", () => {
      expect(() => new AdministrativeDistance(-1)).toThrow("between 0 and 255");
    });

    it("should reject values above 255", () => {
      expect(() => new AdministrativeDistance(256)).toThrow("between 0 and 255");
    });

    it("should accept boundary values", () => {
      expect(() => new AdministrativeDistance(0)).not.toThrow();
      expect(() => new AdministrativeDistance(255)).not.toThrow();
    });
  });

  describe("protocolName", () => {
    it("should identify connected routes", () => {
      const ad = new AdministrativeDistance(0);
      expect(ad.protocolName).toBe("Connected");
    });

    it("should identify static routes", () => {
      const ad = new AdministrativeDistance(1);
      expect(ad.protocolName).toBe("Static");
    });

    it("should identify EIGRP internal routes", () => {
      const ad = new AdministrativeDistance(90);
      expect(ad.protocolName).toBe("Eigrp Internal");
    });

    it("should identify OSPF routes", () => {
      const ad = new AdministrativeDistance(110);
      expect(ad.protocolName).toBe("Ospf");
    });

    it("should identify RIP routes", () => {
      const ad = new AdministrativeDistance(120);
      expect(ad.protocolName).toBe("Rip");
    });

    it("should identify BGP routes", () => {
      const ad = new AdministrativeDistance(200);
      expect(ad.protocolName).toBe("Bgp Local");
    });

    it("should return null for non-standard values", () => {
      const ad = new AdministrativeDistance(50);
      expect(ad.protocolName).toBeNull();
    });
  });

  describe("type guards", () => {
    it("should identify connected routes", () => {
      expect(new AdministrativeDistance(0).isConnected).toBe(true);
      expect(new AdministrativeDistance(1).isConnected).toBe(false);
    });

    it("should identify static routes", () => {
      expect(new AdministrativeDistance(1).isStatic).toBe(true);
      expect(new AdministrativeDistance(90).isStatic).toBe(false);
    });

    it("should identify EIGRP routes", () => {
      expect(new AdministrativeDistance(90).isEigrp).toBe(true);
      expect(new AdministrativeDistance(170).isEigrp).toBe(true);
      expect(new AdministrativeDistance(5).isEigrp).toBe(true);
      expect(new AdministrativeDistance(110).isEigrp).toBe(false);
    });

    it("should identify OSPF routes", () => {
      expect(new AdministrativeDistance(110).isOspf).toBe(true);
      expect(new AdministrativeDistance(90).isOspf).toBe(false);
    });

    it("should identify RIP routes", () => {
      expect(new AdministrativeDistance(120).isRip).toBe(true);
      expect(new AdministrativeDistance(110).isRip).toBe(false);
    });

    it("should identify BGP routes", () => {
      expect(new AdministrativeDistance(200).isBgp).toBe(true);
      expect(new AdministrativeDistance(20).isBgp).toBe(true);
      expect(new AdministrativeDistance(110).isBgp).toBe(false);
    });

    it("should identify unreachable routes", () => {
      expect(new AdministrativeDistance(255).isUnreachable).toBe(true);
      expect(new AdministrativeDistance(110).isUnreachable).toBe(false);
    });

    it("should identify well-known AD values", () => {
      expect(new AdministrativeDistance(0).isWellKnown).toBe(true);
      expect(new AdministrativeDistance(90).isWellKnown).toBe(true);
      expect(new AdministrativeDistance(50).isWellKnown).toBe(false);
    });
  });

  describe("comparison", () => {
    it("should check if more trusted than another", () => {
      const staticAd = new AdministrativeDistance(1);
      const ospfAd = new AdministrativeDistance(110);
      
      expect(staticAd.isMoreTrustedThan(ospfAd)).toBe(true);
      expect(ospfAd.isMoreTrustedThan(staticAd)).toBe(false);
    });

    it("should check if less trusted than another", () => {
      const ripAd = new AdministrativeDistance(120);
      const ospfAd = new AdministrativeDistance(110);
      
      expect(ripAd.isLessTrustedThan(ospfAd)).toBe(true);
      expect(ospfAd.isLessTrustedThan(ripAd)).toBe(false);
    });
  });

  describe("fromProtocol", () => {
    it("should create AD from protocol key", () => {
      expect(AdministrativeDistance.fromProtocol("STATIC").value).toBe(1);
      expect(AdministrativeDistance.fromProtocol("OSPF").value).toBe(110);
      expect(AdministrativeDistance.fromProtocol("EIGRP_INTERNAL").value).toBe(90);
      expect(AdministrativeDistance.fromProtocol("RIP").value).toBe(120);
    });
  });

  describe("static factory methods", () => {
    it("should create static route AD", () => {
      expect(AdministrativeDistance.forStatic().value).toBe(1);
    });

    it("should create OSPF route AD", () => {
      expect(AdministrativeDistance.forOspf().value).toBe(110);
    });

    it("should create RIP route AD", () => {
      expect(AdministrativeDistance.forRip().value).toBe(120);
    });

    it("should create EIGRP internal route AD", () => {
      expect(AdministrativeDistance.forEigrpInternal().value).toBe(90);
    });

    it("should create EIGRP external route AD", () => {
      expect(AdministrativeDistance.forEigrpExternal().value).toBe(170);
    });
  });

  describe("equals", () => {
    it("should compare equality", () => {
      const ad1 = new AdministrativeDistance(90);
      const ad2 = new AdministrativeDistance(90);
      const ad3 = new AdministrativeDistance(110);
      
      expect(ad1.equals(ad2)).toBe(true);
      expect(ad1.equals(ad3)).toBe(false);
    });
  });

  describe("toString", () => {
    it("should return string representation with protocol name", () => {
      expect(new AdministrativeDistance(90).toString()).toBe("90 (Eigrp Internal)");
      expect(new AdministrativeDistance(110).toString()).toBe("110 (Ospf)");
    });

    it("should return just value for unknown protocols", () => {
      expect(new AdministrativeDistance(50).toString()).toBe("50");
    });
  });
});

describe("parseAdministrativeDistance", () => {
  it("should parse valid values", () => {
    const ad = parseAdministrativeDistance(90);
    expect(ad.value).toBe(90);
  });

  it("should throw for invalid values", () => {
    expect(() => parseAdministrativeDistance(300)).toThrow();
  });
});

describe("isValidAdministrativeDistance", () => {
  it("should return true for valid values", () => {
    expect(isValidAdministrativeDistance(90)).toBe(true);
    expect(isValidAdministrativeDistance(0)).toBe(true);
    expect(isValidAdministrativeDistance(255)).toBe(true);
  });

  it("should return false for invalid values", () => {
    expect(isValidAdministrativeDistance(-1)).toBe(false);
    expect(isValidAdministrativeDistance(256)).toBe(false);
    expect(isValidAdministrativeDistance(90.5)).toBe(false);
  });
});

describe("WELL_KNOWN_AD", () => {
  it("should have correct well-known values", () => {
    expect(WELL_KNOWN_AD.CONNECTED).toBe(0);
    expect(WELL_KNOWN_AD.STATIC).toBe(1);
    expect(WELL_KNOWN_AD.EIGRP_INTERNAL).toBe(90);
    expect(WELL_KNOWN_AD.OSPF).toBe(110);
    expect(WELL_KNOWN_AD.RIP).toBe(120);
    expect(WELL_KNOWN_AD.BGP_LOCAL).toBe(200);
    expect(WELL_KNOWN_AD.UNREACHABLE).toBe(255);
  });
});
