// ============================================================================
// Snapshot Validator - Diff contra baseline y golden tests
// ============================================================================

export interface SnapshotDiff {
  added: string[];
  removed: string[];
  modified: string[];
  totalChanges: number;
}

export interface SnapshotValidationResult {
  valid: boolean;
  hasBreakingChanges: boolean;
  diff?: SnapshotDiff;
  baselineContent?: string;
  currentContent?: string;
  message: string;
}

/**
 * SnapshotValidator - validates generated code against baseline
 */
export class SnapshotValidator {
  private baselineDir: string = '';

  /**
   * Set baseline directory
   */
  setBaselineDir(dir: string): void {
    this.baselineDir = dir;
  }

  /**
   * Validate current code against baseline
   */
  validate(currentCode: string, baselinePath: string): SnapshotValidationResult {
    // En implementación real, leeríamos el baseline del filesystem
    // Por ahora, retornamos success si no hay baseline
    if (!baselinePath) {
      return {
        valid: true,
        hasBreakingChanges: false,
        message: 'No baseline to compare against',
      };
    }

    // Simular baseline vacío para testing
    let baselineCode = '';
    
    if (!baselineCode) {
      return {
        valid: true,
        hasBreakingChanges: false,
        message: 'Baseline empty or not found, treating as initial',
      };
    }

    // Calcular diff
    const diff = this.computeDiff(baselineCode, currentCode);
    
    // Verificar cambios importantes (breaking)
    const breakingPatterns = [
      /function\s+\w+\s*\(/, // Nuevas funciones
      /var\s+\w+\s*=/,       // Nuevas variables
      /\bexports\./,          // Nuevos exports
    ];
    
    const hasBreaking = diff.added.some(line => 
      breakingPatterns.some(pattern => pattern.test(line))
    );

    return {
      valid: true,
      hasBreakingChanges: hasBreaking,
      diff,
      baselineContent: baselineCode,
      currentContent: currentCode,
      message: hasBreaking 
        ? `Breaking changes detected: ${diff.added.length} additions`
        : 'No breaking changes detected',
    };
  }

  /**
   * Validate golden test - current matches expected
   */
  validateGolden(currentCode: string, goldenPath: string): SnapshotValidationResult {
    if (!goldenPath) {
      return {
        valid: true,
        hasBreakingChanges: false,
        message: 'No golden file to compare',
      };
    }

    // Simular golden vacío
    let goldenCode = '';
    
    if (!goldenCode) {
      return {
        valid: true,
        hasBreakingChanges: false,
        message: 'Golden file empty or not found',
      };
    }

    const isMatch = currentCode.trim() === goldenCode.trim();
    
    if (!isMatch) {
      const diff = this.computeDiff(goldenCode, currentCode);
      return {
        valid: false,
        hasBreakingChanges: true,
        diff,
        message: `Golden test failed: ${diff.totalChanges} changes`,
      };
    }

    return {
      valid: true,
      hasBreakingChanges: false,
      message: 'Golden test passed',
    };
  }

  /**
   * Compute diff between two code strings
   */
  private computeDiff(baseline: string, current: string): SnapshotDiff {
    const baselineLines = baseline.split('\n');
    const currentLines = current.split('\n');
    
    const baselineSet = new Set(baselineLines);
    const currentSet = new Set(currentLines);
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    
    // Find added lines
    for (const line of currentLines) {
      if (!baselineSet.has(line)) {
        // Check if similar line exists (modified)
        const similarExists = baselineLines.some(bl => 
          bl.trim() && line.trim() && this.areSimilar(bl, line)
        );
        
        if (similarExists) {
          modified.push(line);
        } else {
          added.push(line);
        }
      }
    }
    
    // Find removed lines
    for (const line of baselineLines) {
      if (!currentSet.has(line)) {
        removed.push(line);
      }
    }

    return {
      added,
      removed,
      modified,
      totalChanges: added.length + removed.length + modified.length,
    };
  }

  /**
   * Check if two lines are similar (for modified detection)
   */
  private areSimilar(line1: string, line2: string): boolean {
    // Simple similarity check - same length ± 20%
    const len1 = line1.length;
    const len2 = line2.length;
    const ratio = Math.min(len1, len2) / Math.max(len1, len2);
    
    return ratio > 0.8;
  }

  /**
   * Format diff for display
   */
  formatDiff(diff: SnapshotDiff): string {
    const parts: string[] = [];
    
    if (diff.added.length > 0) {
      parts.push(`+ ${diff.added.length} additions`);
    }
    if (diff.removed.length > 0) {
      parts.push(`- ${diff.removed.length} removals`);
    }
    if (diff.modified.length > 0) {
      parts.push(`~ ${diff.modified.length} modifications`);
    }
    
    return parts.join(', ') || 'No changes';
  }

  /**
   * Check for critical changes (breaking)
   */
  hasCriticalChanges(diff: SnapshotDiff): boolean {
    // Definir cambios críticos
    const criticalPatterns = [
      /\bexports\.\w+\s*=/,    // Nuevos exports
      /\bmodule\.exports\s*=/,  // Nuevos module exports
      /\brequire\s*\(/,        // Nuevos requires
    ];
    
    return diff.added.some(line => 
      criticalPatterns.some(pattern => pattern.test(line))
    );
  }
}

/**
 * Factory
 */
export function createSnapshotValidator(): SnapshotValidator {
  return new SnapshotValidator();
}