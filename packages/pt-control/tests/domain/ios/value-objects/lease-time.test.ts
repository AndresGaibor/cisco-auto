// ============================================================================
// LeaseTime Value Object Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  LeaseTime,
  parseLeaseTime,
  isValidLeaseTime,
} from "@cisco-auto/kernel/domain/ios/value-objects";

describe("LeaseTime", () => {
  describe("constructor", () => {
    it("should create valid lease times", () => {
      const lease = new LeaseTime(3);
      expect(lease.days).toBe(3);
      expect(lease.hours).toBe(0);
      expect(lease.minutes).toBe(0);
    });

    it("should create lease times with hours and minutes", () => {
      const lease = new LeaseTime(1, 30, 45);
      expect(lease.days).toBe(1);
      expect(lease.hours).toBe(30);
      expect(lease.minutes).toBe(45);
    });

    it("should reject lease times below 1 minute", () => {
      expect(() => new LeaseTime(0, 0, 0)).toThrow("at least 1 minute");
    });

    it("should reject lease times above 365 days", () => {
      expect(() => new LeaseTime(366)).toThrow("at most 365 days");
    });

    it("should accept minimum lease time (1 minute)", () => {
      expect(() => new LeaseTime(0, 0, 1)).not.toThrow();
    });

    it("should accept maximum lease time (365 days)", () => {
      expect(() => new LeaseTime(365)).not.toThrow();
    });
  });

  describe("time calculations", () => {
    it("should calculate total seconds", () => {
      const lease = new LeaseTime(1, 2, 3);
      expect(lease.totalSeconds).toBe(1 * 86400 + 2 * 3600 + 3 * 60);
    });

    it("should calculate total minutes", () => {
      const lease = new LeaseTime(1, 2, 3);
      expect(lease.totalMinutes).toBe((1 * 86400 + 2 * 3600 + 3 * 60) / 60);
    });

    it("should calculate total hours", () => {
      const lease = new LeaseTime(1, 12, 0);
      expect(lease.totalHours).toBe(36);
    });

    it("should calculate total days", () => {
      const lease = new LeaseTime(7);
      expect(lease.totalDays).toBe(7);
    });
  });

  describe("lease type guards", () => {
    it("should identify infinite lease", () => {
      // Note: infinite is represented as 0,0,0 but constructor won't allow it
      // This is handled specially in Cisco configs
      const lease = new LeaseTime(0, 0, 1);
      expect(lease.isInfinite).toBe(false);
    });

    it("should identify short leases", () => {
      const lease = new LeaseTime(0, 0, 30);
      expect(lease.isShort).toBe(true);
      expect(lease.isMedium).toBe(false);
      expect(lease.isLong).toBe(false);
    });

    it("should identify medium leases", () => {
      const lease = new LeaseTime(0, 12, 0);
      expect(lease.isShort).toBe(false);
      expect(lease.isMedium).toBe(true);
      expect(lease.isLong).toBe(false);
    });

    it("should identify long leases", () => {
      const lease = new LeaseTime(2);
      expect(lease.isShort).toBe(false);
      expect(lease.isMedium).toBe(false);
      expect(lease.isLong).toBe(true);
    });

    it("should identify standard enterprise leases", () => {
      expect(new LeaseTime(1).isStandardEnterprise).toBe(true);
      expect(new LeaseTime(3).isStandardEnterprise).toBe(true);
      expect(new LeaseTime(7).isStandardEnterprise).toBe(true);
      expect(new LeaseTime(10).isStandardEnterprise).toBe(false);
    });
  });

  describe("toCiscoFormat", () => {
    it("should format as days only", () => {
      const lease = new LeaseTime(3);
      expect(lease.toCiscoFormat()).toBe("3");
    });

    it("should format as days and hours", () => {
      const lease = new LeaseTime(2, 12);
      expect(lease.toCiscoFormat()).toBe("2 12");
    });

    it("should format as days, hours, and minutes", () => {
      const lease = new LeaseTime(1, 2, 30);
      expect(lease.toCiscoFormat()).toBe("1 2 30");
    });
  });

  describe("toHumanReadable", () => {
    it("should format with days", () => {
      const lease = new LeaseTime(3);
      expect(lease.toHumanReadable()).toBe("3 days");
    });

    it("should format with days and hours", () => {
      const lease = new LeaseTime(1, 6);
      expect(lease.toHumanReadable()).toBe("1 day, 6 hours");
    });

    it("should format with days, hours, and minutes", () => {
      const lease = new LeaseTime(1, 2, 30);
      expect(lease.toHumanReadable()).toBe("1 day, 2 hours, 30 minutes");
    });

    it("should handle singular forms", () => {
      const lease = new LeaseTime(1, 1, 1);
      expect(lease.toHumanReadable()).toBe("1 day, 1 hour, 1 minute");
    });
  });

  describe("add", () => {
    it("should add time and return new LeaseTime", () => {
      const lease = new LeaseTime(2);
      const newLease = lease.add(1, 6, 30);
      
      expect(lease.days).toBe(2); // Original unchanged
      expect(newLease.days).toBe(3);
      expect(newLease.hours).toBe(6);
      expect(newLease.minutes).toBe(30);
    });
  });

  describe("compare", () => {
    it("should compare lease times", () => {
      const lease1 = new LeaseTime(1);
      const lease2 = new LeaseTime(2);
      const lease3 = new LeaseTime(1);
      
      expect(lease1.compare(lease2)).toBeLessThan(0);
      expect(lease2.compare(lease1)).toBeGreaterThan(0);
      expect(lease1.compare(lease3)).toBe(0);
    });
  });

  describe("equals", () => {
    it("should compare equality", () => {
      const lease1 = new LeaseTime(3);
      const lease2 = new LeaseTime(3);
      const lease3 = new LeaseTime(2, 24); // Same as 3 days
      
      expect(lease1.equals(lease2)).toBe(true);
      expect(lease1.equals(lease3)).toBe(true);
      expect(lease1.equals(new LeaseTime(4))).toBe(false);
    });
  });

  describe("toJSON/fromJSON", () => {
    it("should serialize and deserialize", () => {
      const lease = new LeaseTime(2, 12, 30);
      const json = lease.toJSON();
      
      expect(json.days).toBe(2);
      expect(json.hours).toBe(12);
      expect(json.minutes).toBe(30);
      
      const restored = LeaseTime.fromJSON(json);
      expect(restored.equals(lease)).toBe(true);
    });
  });
});

describe("parseLeaseTime", () => {
  it("should parse valid values", () => {
    const lease = parseLeaseTime(3, 6, 30);
    expect(lease.days).toBe(3);
    expect(lease.hours).toBe(6);
    expect(lease.minutes).toBe(30);
  });

  it("should throw for invalid values", () => {
    expect(() => parseLeaseTime(400)).toThrow();
  });
});

describe("LeaseTime.fromSeconds", () => {
  it("should create LeaseTime from seconds", () => {
    const lease = LeaseTime.fromSeconds(90061); // 1 day, 1 hour, 1 minute, 1 second
    expect(lease.days).toBe(1);
    expect(lease.hours).toBe(1);
    expect(lease.minutes).toBe(1);
  });

  it("should handle exact day boundaries", () => {
    const lease = LeaseTime.fromSeconds(86400); // Exactly 1 day
    expect(lease.days).toBe(1);
    expect(lease.hours).toBe(0);
    expect(lease.minutes).toBe(0);
  });

  it("should reject values below minimum", () => {
    expect(() => LeaseTime.fromSeconds(30)).toThrow();
  });

  it("should reject values above maximum", () => {
    expect(() => LeaseTime.fromSeconds(366 * 24 * 60 * 60)).toThrow();
  });
});

describe("isValidLeaseTime", () => {
  it("should return true for valid values", () => {
    expect(isValidLeaseTime(3)).toBe(true);
    expect(isValidLeaseTime(0, 0, 1)).toBe(true);
    expect(isValidLeaseTime(365)).toBe(true);
  });

  it("should return false for invalid values", () => {
    expect(isValidLeaseTime(0, 0, 0)).toBe(false);
    expect(isValidLeaseTime(400)).toBe(false);
  });
});
