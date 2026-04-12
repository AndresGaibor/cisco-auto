// ============================================================================
// SessionArbiter - Serializa jobs por device y maneja heartbeats
// ============================================================================

import type { QueuedJob } from './policy-types.js';

export interface HeartbeatStatus {
  device: string;
  lastHeartbeat: Date;
  isAlive: boolean;
  missedBeats: number;
}

export interface JobExecutionResult {
  jobId: string;
  success: boolean;
  output?: string;
  error?: string;
  executedAt: Date;
}

/**
 * Arbitro de sesión - serializa jobs por device y monitorea heartbeats
 */
export class SessionArbiter {
  private queues: Map<string, QueuedJob[]> = new Map();
  private executing: Map<string, QueuedJob> = new Map();
  private heartbeats: Map<string, HeartbeatStatus> = new Map();
  private heartbeatIntervalMs: number = 1000;
  private maxMissedBeats: number = 30; // 30 segundos sin heartbeat = zombie

  constructor(heartbeatIntervalMs: number = 1000) {
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  /**
   * Enqueue un job para ejecución
   */
  enqueue(job: QueuedJob): void {
    if (!this.queues.has(job.device)) {
      this.queues.set(job.device, []);
    }
    this.queues.get(job.device)!.push(job);
  }

  /**
   * Obtener siguiente job de la cola (sin remover)
   */
  peekNext(device: string): QueuedJob | null {
    const queue = this.queues.get(device);
    if (!queue || queue.length === 0) return null;
    return queue[0];
  }

  /**
   * Obtener y remover siguiente job de la cola
   */
  dequeue(device: string): QueuedJob | null {
    const queue = this.queues.get(device);
    if (!queue || queue.length === 0) return null;
    const job = queue.shift()!;
    this.executing.set(device, job);
    return job;
  }

  /**
   * Marcar job como completado
   */
  complete(device: string, jobId: string, result: JobExecutionResult): void {
    const executingJob = this.executing.get(device);
    if (executingJob && executingJob.id === jobId) {
      this.executing.delete(device);
    }
  }

  /**
   * Obtener jobs en cola para un device
   */
  getQueuedJobs(device: string): QueuedJob[] {
    return this.queues.get(device) || [];
  }

  /**
   * Obtener job ejecutándose actualmente
   */
  getExecutingJob(device: string): QueuedJob | null {
    return this.executing.get(device) || null;
  }

  /**
   * Verificar si hay job ejecutándose
   */
  isExecuting(device: string): boolean {
    return this.executing.has(device);
  }

  /**
   * Limpiar cola de un device
   */
  clearQueue(device: string): void {
    this.queues.delete(device);
  }

  /**
   * Limpiar todo
   */
  clearAll(): void {
    this.queues.clear();
    this.executing.clear();
    this.heartbeats.clear();
  }

  // ==================== Heartbeat Management ====================

  /**
   * Registrar latido de un device
   */
  registerHeartbeat(device: string): void {
    const now = new Date();
    const existing = this.heartbeats.get(device);
    
    if (existing) {
      const missedBeats = existing.isAlive 
        ? 0 
        : existing.missedBeats + 1;
      
      this.heartbeats.set(device, {
        device,
        lastHeartbeat: now,
        isAlive: true,
        missedBeats,
      });
    } else {
      this.heartbeats.set(device, {
        device,
        lastHeartbeat: now,
        isAlive: true,
        missedBeats: 0,
      });
    }
  }

  /**
   * Obtener estado de heartbeat
   */
  getHeartbeatStatus(device: string): HeartbeatStatus | null {
    return this.heartbeats.get(device) || null;
  }

  /**
   * Verificar si un device está vivo (tiene heartbeats recientes)
   */
  isAlive(device: string): boolean {
    const status = this.heartbeats.get(device);
    if (!status) return false;
    
    const now = new Date();
    const elapsed = now.getTime() - status.lastHeartbeat.getTime();
    const maxElapsed = this.maxMissedBeats * this.heartbeatIntervalMs;
    
    return elapsed < maxElapsed;
  }

  /**
   * Obtener todos los devices con heartbeat detectado como zombies
   */
  getZombieDevices(): string[] {
    const zombies: string[] = [];
    
    for (const [device, status] of Array.from(this.heartbeats.entries())) {
      if (!this.isAlive(device)) {
        zombies.push(device);
      }
    }
    
    return zombies;
  }

  /**
   * Forzar cleanup de un device (matar sesión)
   */
  forceKill(device: string): void {
    this.executing.delete(device);
    this.queues.delete(device);
    
    // Marcar como no vivo
    const status = this.heartbeats.get(device);
    if (status) {
      status.isAlive = false;
    }
  }

  /**
   * Obtener cola global de jobs pendientes
   */
  getTotalQueuedJobs(): number {
    let total = 0;
    for (const queue of Array.from(this.queues.values())) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Obtener todos los devices con jobs en cola
   */
  getDevicesWithQueuedJobs(): string[] {
    return Array.from(this.queues.keys()).filter(
      device => (this.queues.get(device)?.length || 0) > 0
    );
  }

  /**
   * Obtener statistics
   */
  getStats(): {
    totalQueued: number;
    totalExecuting: number;
    devicesWithJobs: number;
    aliveDevices: number;
  } {
    let aliveCount = 0;
    for (const status of Array.from(this.heartbeats.values())) {
      if (status.isAlive) aliveCount++;
    }

    return {
      totalQueued: this.getTotalQueuedJobs(),
      totalExecuting: this.executing.size,
      devicesWithJobs: this.getDevicesWithQueuedJobs().length,
      aliveDevices: aliveCount,
    };
  }
}