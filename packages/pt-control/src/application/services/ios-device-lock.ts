/**
 * iOS Device Lock - Manages device-level locking for concurrent access
 * Prevents race conditions and ensures atomic operations
 */

export interface DeviceLock {
  deviceId: string;
  lockId: string;
  acquiredAt: number;
  expiresAt: number;
  owner?: string;
}

export class IOSDeviceLock {
  private locks = new Map<string, DeviceLock>();
  private readonly lockTimeout = 30000; // 30 seconds

  async acquireLock(deviceId: string, lockId: string, owner?: string): Promise<boolean> {
    const existingLock = this.locks.get(deviceId);

    // Check if lock exists and is still valid
    if (existingLock && existingLock.expiresAt > Date.now()) {
      return false; // Lock already held
    }

    // Acquire new lock
    const lock: DeviceLock = {
      deviceId,
      lockId,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + this.lockTimeout,
      owner,
    };

    this.locks.set(deviceId, lock);
    return true;
  }

  releaseLock(deviceId: string, lockId: string): boolean {
    const lock = this.locks.get(deviceId);

    if (!lock || lock.lockId !== lockId) {
      return false;
    }

    this.locks.delete(deviceId);
    return true;
  }

  isLocked(deviceId: string): boolean {
    const lock = this.locks.get(deviceId);
    if (!lock) return false;

    // Check if lock has expired
    if (lock.expiresAt < Date.now()) {
      this.locks.delete(deviceId);
      return false;
    }

    return true;
  }

  getLock(deviceId: string): DeviceLock | undefined {
    return this.locks.get(deviceId);
  }

  async withLock<T>(deviceId: string, fn: () => Promise<T>): Promise<T> {
    const lockId = `lock-${Date.now()}-${Math.random()}`;

    const acquired = await this.acquireLock(deviceId, lockId);
    if (!acquired) {
      throw new Error(`Failed to acquire lock for device ${deviceId}`);
    }

    try {
      return await fn();
    } finally {
      this.releaseLock(deviceId, lockId);
    }
  }

  clearExpiredLocks(): number {
    let cleared = 0;
    const now = Date.now();

    for (const [deviceId, lock] of this.locks.entries()) {
      if (lock.expiresAt < now) {
        this.locks.delete(deviceId);
        cleared++;
      }
    }

    return cleared;
  }
}
