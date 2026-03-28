/**
 * Logging Types for PT Control v2
 * NDJSON logging with session tracking
 */

/**
 * Log entry structure - each entry is one line in NDJSON file
 */
export interface LogEntry {
  /** Session identifier - groups related operations */
  session_id: string;
  
  /** Correlation ID for tracing individual operations */
  correlation_id: string;
  
  /** ISO timestamp of the log entry */
  timestamp: string;
  
  /** Action being performed (e.g., "device list", "device reset") */
  action: string;
  
  /** Target device name if applicable */
  target_device?: string;
  
  /** Outcome of the action */
  outcome: 'success' | 'failure' | 'cancelled' | 'pending';
  
  /** Duration in milliseconds if measurable */
  duration_ms?: number;
  
  /** Additional context as JSON */
  context?: Record<string, unknown>;
  
  /** Error message if outcome is failure */
  error?: string;
  
  /** Whether this was a destructive action */
  is_destructive?: boolean;
  
  /** User confirmation status for destructive actions */
  confirmation_status?: 'confirmed' | 'cancelled' | 'timeout' | 'not_required';
}

/**
 * Session tracking for grouping related log entries
 */
export interface LogSession {
  /** Unique session identifier */
  id: string;
  
  /** When the session started */
  started_at: Date;
  
  /** When the session ended (if completed) */
  ended_at?: Date;
  
  /** All entries in this session */
  entries: LogEntry[];
}

/**
 * Configuration for LogManager
 */
export interface LogConfig {
  /** Directory to store log files */
  logDir: string;
  
  /** Number of days to keep log files */
  retentionDays: number;
  
  /** Prefix for log file names */
  prefix: string;
}

/**
 * Options for querying logs
 */
export interface LogQueryOptions {
  /** Filter by session ID */
  session_id?: string;
  
  /** Filter by action */
  action?: string;
  
  /** Filter by outcome */
  outcome?: LogEntry['outcome'];
  
  /** Filter by target device */
  target_device?: string;
  
  /** Filter entries after this date */
  from?: Date;
  
  /** Filter entries before this date */
  to?: Date;
  
  /** Maximum number of entries to return */
  limit?: number;
}

/**
 * Statistics about logging
 */
export interface LogStats {
  /** Total number of log files */
  fileCount: number;
  
  /** Total size in bytes */
  totalSize: number;
  
  /** Oldest log file date */
  oldestFile?: Date;
  
  /** Newest log file date */
  newestFile?: Date;
  
  /** Total entries across all files */
  totalEntries: number;
}
