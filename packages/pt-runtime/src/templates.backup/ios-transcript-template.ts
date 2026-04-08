/**
 * IOS Transcript Recorder Template (Fase 6)
 * 
 * Records all events from an interactive IOS session.
 * Provides transcript summary for debugging and trazability.
 * 
 * Generated into: pt-runtime/src/templates/ios-transcript-template.ts
 */

export interface TranscriptEvent {
  timestamp: number;  // Relative to session start (ms)
  type: string;
  payload?: Record<string, unknown>;
}

/**
 * Recorder for session transcript events
 * Compact version for Fase 6 (full persistence comes in Fase 7)
 */
export class IosTranscriptRecorder {
  private entries: TranscriptEvent[] = [];
  private startTime = Date.now();

  /**
   * Record an event in the transcript
   */
  record(type: string, payload?: Record<string, unknown>): void {
    this.entries.push({
      timestamp: Date.now() - this.startTime,
      type,
      payload: payload || {}
    });
  }

  /**
   * Get full transcript with all events
   */
  getTranscript(): TranscriptEvent[] {
    return [...this.entries];
  }

  /**
   * Get compact transcript (filter out verbose events)
   * For Fase 6, we keep high-level events only:
   * - command-sent
   * - prompt-changed
   * - mode-changed
   * - paging-advanced
   * - confirm-answered
   * - password-requested
   * - command-ended
   * - exception
   * 
   * We skip low-level events like every byte of output.
   */
  getCompact(): TranscriptEvent[] {
    return this.entries.filter(e => {
      // Events to include
      const important = [
        'commandStarted',
        'commandEnded',
        'promptChanged',
        'modeChanged',
        'pagingAdvanced',
        'confirmAnswered',
        'passwordRequested',
        'destinationFilenameAnswered',
        'outputWritten',
        'exception',
        'desync'
      ];
      return important.includes(e.type);
    });
  }

  /**
   * Get execution time since start
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get summary statistics
   */
  summary(): {
    eventCount: number;
    compactEventCount: number;
    duration: number;
    lastEvent?: string;
    lastTimestamp?: number;
  } {
    const compact = this.getCompact();
    const lastEvent = compact[compact.length - 1];
    return {
      eventCount: this.entries.length,
      compactEventCount: compact.length,
      duration: this.getDuration(),
      lastEvent: lastEvent?.type,
      lastTimestamp: lastEvent?.timestamp
    };
  }

  /**
   * Get events of specific type
   */
  getByType(type: string): TranscriptEvent[] {
    return this.entries.filter(e => e.type === type);
  }

  /**
   * Count events of specific type
   */
  countByType(type: string): number {
    return this.entries.filter(e => e.type === type).length;
  }

  /**
   * Reset recorder for new command/session
   */
  reset(): void {
    this.entries = [];
    this.startTime = Date.now();
  }

  /**
   * Convert to JSON-serializable format for result
   */
  toJSON(): {
    summary: ReturnType<IosTranscriptRecorder['summary']>;
    compact: TranscriptEvent[];
  } {
    return {
      summary: this.summary(),
      compact: this.getCompact()
    };
  }
}

/**
 * Helper to create transcript entry from state machine event
 */
export function eventToTranscriptEntry(
  event: Record<string, unknown>,
  timestamp: number
): TranscriptEvent {
  const type = event.type as string;
  const payload = { ...event };
  delete payload.type;

  return {
    timestamp,
    type,
    payload
  };
}

/**
 * Helper to format transcript for logging
 */
export function formatTranscript(recorder: IosTranscriptRecorder): string {
  const compact = recorder.getCompact();
  const lines: string[] = [];
  
  lines.push(`=== IOS Transcript ===`);
  lines.push(`Duration: ${recorder.getDuration()}ms`);
  lines.push(`Events: ${compact.length}`);
  lines.push('');
  
  compact.forEach((entry, i) => {
    const timeStr = `[${entry.timestamp}ms]`.padEnd(10);
    const typeStr = entry.type.padEnd(25);
    const payload = entry.payload ? JSON.stringify(entry.payload) : '';
    
    lines.push(`${timeStr} ${typeStr} ${payload}`);
  });
  
  return lines.join('\n');
}

/**
 * Generator function for PT-side JavaScript template
 * Creates a simple transcript recorder in JavaScript for the PT runtime
 */
export function generateIosTranscriptTemplate(): string {
  return `
// ============================================================================
// IOS Transcript Recorder (Fase 6)
// ============================================================================

function IosTranscriptRecorder() {
  this.entries = [];
  this.startTime = Date.now();
}

IosTranscriptRecorder.prototype.record = function(type, payload) {
  this.entries.push({
    timestamp: Date.now() - this.startTime,
    type: type,
    payload: payload || {}
  });
};

IosTranscriptRecorder.prototype.getTranscript = function() {
  return this.entries.slice();
};

IosTranscriptRecorder.prototype.getCompact = function() {
  var important = [
    'commandStarted', 'commandEnded', 'promptChanged', 'modeChanged',
    'pagingAdvanced', 'confirmAnswered', 'passwordRequested',
    'destinationFilenameAnswered', 'outputWritten', 'exception', 'desync'
  ];
  
  return this.entries.filter(function(e) {
    return important.indexOf(e.type) >= 0;
  });
};

IosTranscriptRecorder.prototype.getDuration = function() {
  return Date.now() - this.startTime;
};

IosTranscriptRecorder.prototype.summary = function() {
  var compact = this.getCompact();
  var lastEvent = compact.length > 0 ? compact[compact.length - 1] : null;
  
  return {
    eventCount: this.entries.length,
    compactEventCount: compact.length,
    duration: this.getDuration(),
    lastEvent: lastEvent ? lastEvent.type : null,
    lastTimestamp: lastEvent ? lastEvent.timestamp : null
  };
};

IosTranscriptRecorder.prototype.getByType = function(type) {
  return this.entries.filter(function(e) {
    return e.type === type;
  });
};

IosTranscriptRecorder.prototype.countByType = function(type) {
  return this.entries.filter(function(e) {
    return e.type === type;
  }).length;
};

IosTranscriptRecorder.prototype.reset = function() {
  this.entries = [];
  this.startTime = Date.now();
};

IosTranscriptRecorder.prototype.toJSON = function() {
  return {
    summary: this.summary(),
    compact: this.getCompact()
  };
};

// Usage in handlers:
// var recorder = new IosTranscriptRecorder();
// recorder.record('commandStarted', { command: cmd });
// ... execution ...
// recorder.record('commandEnded', { status: 0 });
// return { ..., transcriptSummary: recorder.getCompact() };
`;
}
