// packages/pt-runtime/src/pt/kernel/lease.ts
// Lease validation and management

import type { Lease } from "./types";

export interface LeaseManager {
  validate(): boolean;
  waitForLease(onValid: () => void): void;
  stop(): void;
}

export function createLeaseManager(config: {
  devDir: string;
  checkIntervalMs: number;
}) {
  let interval: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  function validate(): boolean {
    try {
      const leaseFile = config.devDir + "/bridge-lease.json";
      
      if (!fm.fileExists(leaseFile)) {
        dprint("[LEASE] No lease file found");
        return false;
      }

      const content = fm.getFileContents(leaseFile);
      if (!content || content.trim().length === 0) {
        dprint("[LEASE] Lease file empty");
        return false;
      }

      const lease: Lease = JSON.parse(content);
      
      if (!lease.ownerId || !lease.expiresAt) {
        dprint("[LEASE] Lease invalid: missing ownerId or expiresAt");
        return false;
      }

      const now = Date.now();
      if (now > lease.expiresAt) {
        dprint("[LEASE] Lease expired at " + new Date(lease.expiresAt).toISOString());
        return false;
      }

      const ageMs = now - lease.updatedAt;
      if (ageMs > lease.ttlMs * 2) {
        dprint("[LEASE] Lease stale (age=" + ageMs + "ms, ttl=" + lease.ttlMs + "ms)");
        return false;
      }

      dprint("[LEASE] Valid (ownerId=" + lease.ownerId.substring(0, 8) + "...)");
      return true;
    } catch (e) {
      dprint("[LEASE] Validation error: " + String(e));
      return false;
    }
  }

  function waitForLease(onValid: () => void): void {
    function check() {
      if (stopped) return;
      
      if (validate()) {
        dprint("[LEASE] Valid lease detected");
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        onValid();
      }
    }

    dprint("[LEASE] Waiting for bridge lease...");
    check();
    interval = setInterval(check, config.checkIntervalMs);
  }

  function stop(): void {
    stopped = true;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  return { validate, waitForLease, stop };
}