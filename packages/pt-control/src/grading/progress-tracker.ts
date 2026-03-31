// ============================================================================
// Progress Tracker - Tracks student/agent progress over time
// ============================================================================

/**
 * Mastery levels for devices
 */
export type MasteryLevel = "beginner" | "intermediate" | "advanced" | "expert";

/**
 * Record of a single attempt at an exercise
 */
export interface Attempt {
  id: string;
  exerciseId: string;
  timestamp: number;
  score: number;
  passed: boolean;
  durationMs: number;
  deviceName?: string;
}

/**
 * Overall health score for an agent or student
 */
export interface HealthScore {
  overall: number;
  trend: "improving" | "stable" | "declining";
  recentAttempts: number;
  successRate: number;
  averageScore: number;
}

/**
 * Mastery information for a specific device
 */
export interface MasteryInfo {
  device: string;
  level: MasteryLevel;
  attempts: number;
  successRate: number;
  lastAttempt?: number;
}

/**
 * ProgressTracker records attempts and computes health/maturity metrics
 */
export class ProgressTracker {
  private attempts: Attempt[] = [];

  /**
   * Record an attempt at an exercise
   */
  recordAttempt(result: {
    exerciseId: string;
    score: number;
    passed: boolean;
    durationMs: number;
    deviceName?: string;
  }): Attempt {
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      exerciseId: result.exerciseId,
      timestamp: Date.now(),
      score: result.score,
      passed: result.passed,
      durationMs: result.durationMs,
      deviceName: result.deviceName,
    };

    this.attempts.push(attempt);
    return attempt;
  }

  /**
   * Get history of attempts for an exercise
   */
  getHistory(exerciseId: string): Attempt[] {
    return this.attempts
      .filter((a) => a.exerciseId === exerciseId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all attempts for a specific device
   */
  getDeviceHistory(deviceName: string): Attempt[] {
    return this.attempts
      .filter((a) => a.deviceName === deviceName)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate overall health score
   */
  getHealthScore(): HealthScore {
    if (this.attempts.length === 0) {
      return {
        overall: 0,
        trend: "stable",
        recentAttempts: 0,
        successRate: 0,
        averageScore: 0,
      };
    }

    const recentWindow = 10;
    const recent = this.attempts.slice(-recentWindow);
    const successRate = recent.filter((a) => a.passed).length / recent.length;
    const averageScore = recent.reduce((sum, a) => sum + a.score, 0) / recent.length;

    // Calculate trend based on last 5 attempts
    const trend = this.calculateTrend();

    // Overall score is weighted average of success rate and average score
    const overall = Math.round(successRate * 50 + averageScore * 0.5);

    return {
      overall,
      trend,
      recentAttempts: recent.length,
      successRate: Math.round(successRate * 100),
      averageScore: Math.round(averageScore),
    };
  }

  /**
   * Determine mastery level for a device
   */
  getMasteryLevel(deviceName: string): MasteryLevel {
    const deviceAttempts = this.getDeviceHistory(deviceName);

    if (deviceAttempts.length === 0) {
      return "beginner";
    }

    const successRate = deviceAttempts.filter((a) => a.passed).length / deviceAttempts.length;
    const attemptCount = deviceAttempts.length;
    const avgScore = deviceAttempts.reduce((sum, a) => sum + a.score, 0) / deviceAttempts.length;

    // Determine level based on experience and performance
    if (attemptCount >= 20 && successRate >= 0.9 && avgScore >= 90) {
      return "expert";
    }
    if (attemptCount >= 10 && successRate >= 0.75 && avgScore >= 75) {
      return "advanced";
    }
    if (attemptCount >= 5 && successRate >= 0.6 && avgScore >= 60) {
      return "intermediate";
    }
    return "beginner";
  }

  /**
   * Get mastery info for all devices
   */
  getAllMastery(): MasteryInfo[] {
    const deviceMap = new Map<string, Attempt[]>();

    for (const attempt of this.attempts) {
      if (attempt.deviceName) {
        const existing = deviceMap.get(attempt.deviceName) ?? [];
        existing.push(attempt);
        deviceMap.set(attempt.deviceName, existing);
      }
    }

    const masteryInfos: MasteryInfo[] = [];

    for (const [device, attempts] of deviceMap) {
      const successRate = attempts.filter((a) => a.passed).length / attempts.length;
      masteryInfos.push({
        device,
        level: this.getMasteryLevel(device),
        attempts: attempts.length,
        successRate: Math.round(successRate * 100),
        lastAttempt: attempts[attempts.length - 1]?.timestamp,
      });
    }

    return masteryInfos;
  }

  /**
   * Clear all recorded attempts
   */
  clear(): void {
    this.attempts = [];
  }

  private calculateTrend(): "improving" | "stable" | "declining" {
    const last5 = this.attempts.slice(-5);
    if (last5.length < 3) return "stable";

    const firstHalf = last5.slice(0, Math.floor(last5.length / 2));
    const secondHalf = last5.slice(Math.floor(last5.length / 2));

    const firstAvg = firstHalf.reduce((s, a) => s + a.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, a) => s + a.score, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    if (diff > 10) return "improving";
    if (diff < -10) return "declining";
    return "stable";
  }
}
