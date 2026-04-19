/**
 * Lease Manager - Manages FileBridge V2 leases (Fase 8)
 * Handles lease acquisition, renewal, and staleness detection
 * CRITICAL: Recovery and consumer operations MUST NOT proceed without valid lease
 */

import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import type { BridgeLease } from "../shared/protocol.js";
import { debug } from "node:util";

export class LeaseManager {
  private readonly ownerId: string;
  private leaseFilePath: string;
  private leaseTtlMs: number;
  private logger: (msg: string) => void;

  constructor(leaseFilePath: string, leaseTtlMs: number = 30000) {
    this.leaseFilePath = leaseFilePath;
    this.leaseTtlMs = leaseTtlMs;
    this.ownerId = randomUUID();
    this.logger = debug('bridge:lease');
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  /**
   * Check if this instance holds a valid (non-stale) lease
   * FASE 8: Explicit predicate for lease validation gates
   */
  hasValidLease(): boolean {
    const existing = this.readLease();
    if (!existing) return false;
    if (existing.ownerId !== this.ownerId) return false;
    return !this.isLeaseStale(existing);
  }

  /**
   * Alias for hasValidLease() - semantic clarity for Fase 8
   */
  isLeaseValid(): boolean {
    return this.hasValidLease();
  }

  acquireLease(): boolean {
    const existing = this.readLease();

    if (existing && !this.isLeaseStale(existing)) {
      if (existing.ownerId !== this.ownerId) {
        return false;
      }
      this.renewLease();
      this.logger(`Using existing lease (ownerId=${existing.ownerId.substring(0, 8)}..., expiresAt=${new Date(existing.expiresAt).toISOString()})`);
      return true;
    }

    return this.tryAcquireLease();
  }

  renewLease(): void {
    this.writeLease(this.buildLease());
    this.logger(`Lease renewed (ownerId=${this.ownerId.substring(0, 8)}..., expires_in=${this.leaseTtlMs}ms)`);
  }

  releaseLease(): void {
    try {
      const current = this.readLease();
      if (current?.ownerId === this.ownerId) {
        unlinkSync(this.leaseFilePath);
        this.logger(`Lease released (ownerId=${this.ownerId.substring(0, 8)}...)`);
      }
    } catch {
      // ignore - best effort
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

  private buildLease(): BridgeLease {
    return {
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
  }

  private writeLease(lease: BridgeLease): void {
    mkdirSync(dirname(this.leaseFilePath), { recursive: true });
    writeFileSync(this.leaseFilePath, JSON.stringify(lease, null, 2), "utf8");
  }

  private tryAcquireLease(): boolean {
    this.writeLease(this.buildLease());

    const written = this.readLease();
    const acquired = written?.ownerId === this.ownerId;
    if (acquired) {
      this.logger(`Lease acquired (ownerId=${this.ownerId.substring(0, 8)}..., ttl=${this.leaseTtlMs}ms)`);
    }
    return acquired;
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
