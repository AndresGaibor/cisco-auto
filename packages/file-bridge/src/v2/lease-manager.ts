/**
 * Lease Manager - Manages FileBridge V2 leases
 * Handles lease acquisition, renewal, and staleness detection
 */

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import type { BridgeLease } from "../shared/protocol.js";
import { atomicWriteFile } from "../shared/fs-atomic.js";

export class LeaseManager {
  private readonly ownerId = randomUUID();
  private leaseFilePath: string;
  private leaseTtlMs: number;

  constructor(leaseFilePath: string, leaseTtlMs: number = 5000) {
    this.leaseFilePath = leaseFilePath;
    this.leaseTtlMs = leaseTtlMs;
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  /**
   * Check if this instance holds a valid (non-stale) lease
   */
  hasValidLease(): boolean {
    const existing = this.readLease();
    if (!existing) return false;
    if (existing.ownerId !== this.ownerId) return false;
    return !this.isLeaseStale(existing);
  }

  acquireLease(): boolean {
    const existing = this.readLease();
    if (existing && !this.isLeaseStale(existing)) {
      if (existing.ownerId === this.ownerId) {
        this.renewLease();
        return true;
      }
      return false;
    }

    return this.tryAcquireLease();
  }

  renewLease(): void {
    const lease: BridgeLease = {
      ownerId: this.ownerId,
      pid: process.pid,
      hostname: hostname(),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + this.leaseTtlMs,
      ttlMs: this.leaseTtlMs,
      processTitle: process.title || "node",
      version: "2.0.0",
    };

    atomicWriteFile(this.leaseFilePath, JSON.stringify(lease, null, 2));
  }

  releaseLease(): void {
    try {
      const current = this.readLease();
      if (current?.ownerId === this.ownerId) {
        unlinkSync(this.leaseFilePath);
      }
    } catch {
      // ignore
    }
  }

  readLease(): BridgeLease | null {
    try {
      const content = readFileSync(this.leaseFilePath, "utf8");
      return JSON.parse(content) as BridgeLease;
    } catch {
      return null;
    }
  }

  private tryAcquireLease(): boolean {
    const lease: BridgeLease = {
      ownerId: this.ownerId,
      pid: process.pid,
      hostname: hostname(),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + this.leaseTtlMs,
      ttlMs: this.leaseTtlMs,
      processTitle: process.title || "node",
      version: "2.0.0",
    };

    atomicWriteFile(this.leaseFilePath, JSON.stringify(lease, null, 2));

    const written = this.readLease();
    return written?.ownerId === this.ownerId;
  }

  private isLeaseStale(lease: BridgeLease): boolean {
    // Expired by TTL
    if (Date.now() > lease.expiresAt) return true;

    // Process is dead (only check on same hostname)
    if (lease.hostname === hostname()) {
      if (!this.isProcessAlive(lease.pid)) {
        return true;
      }
      // PID recycling check: verify process title matches
      if (process.platform === "linux" && lease.processTitle) {
        try {
          const cmdline = readFileSync(`/proc/${lease.pid}/cmdline`, "utf8").replace(/\0/g, " ");
          if (!cmdline.includes(lease.processTitle)) {
            return true;
          }
        } catch {
          // can't verify, trust TTL
        }
      }
    }

    return false;
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
