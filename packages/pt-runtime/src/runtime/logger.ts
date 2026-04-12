// packages/pt-runtime/src/runtime/logger.ts
// PT Structured Logger — Observable runtime within QtScript constraints
//
// DESIGN CONSTRAINTS:
// - Must compile to ES5 (no arrow functions, no template literals in output)
// - Must work in QtScript (no console, no Date.now() in all contexts)
// - Must work in Node.js (for testing)
// - Must be lightweight (QtScript has limited memory)
// - Must use dprint() as transport in QtScript, console.error in Node.js

declare function dprint(msg: string): void;

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  logger: string;
  msg: string;
  data?: Record<string, unknown>;
  traceId?: string;
  commandType?: string;
  device?: string;
  ticket?: string;
}

export interface PtLoggerConfig {
  level: LogLevel;
  includeData: boolean;
  enableTracing: boolean;
  transport: (entry: LogEntry) => void;
  maxDataSize: number;
}

var DEFAULT_CONFIG: PtLoggerConfig = {
  level: "info",
  includeData: true,
  enableTracing: true,
  transport:
    typeof dprint === "function"
      ? function (entry: LogEntry) {
          dprint(JSON.stringify(entry));
        }
      : function (entry: LogEntry) {
          console.error(JSON.stringify(entry));
        },
  maxDataSize: 2048,
};

var LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export class PtLogger {
  private config: PtLoggerConfig;
  private context: Partial<LogEntry>;

  constructor(name: string, config?: Partial<PtLoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.context = { logger: name };
  }

  child(extraContext: Partial<LogEntry>): PtLogger {
    var childLogger = new PtLogger(this.context.logger || "unknown", this.config);
    childLogger.context = { ...this.context, ...extraContext };
    return childLogger;
  }

  withTrace(traceId: string): PtLogger {
    return this.child({ traceId: traceId });
  }

  withDevice(device: string): PtLogger {
    return this.child({ device: device });
  }

  withCommand(commandType: string): PtLogger {
    return this.child({ commandType: commandType });
  }

  withTicket(ticket: string): PtLogger {
    return this.child({ ticket: ticket });
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.emit("debug", msg, data);
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.emit("info", msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.emit("warn", msg, data);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.emit("error", msg, data);
  }

  private emit(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.level]) {
      return;
    }

    var entry: LogEntry = {
      ts: this.getTimestamp(),
      level: level,
      logger: this.context.logger || "unknown",
      msg: msg,
    };

    if (this.context.traceId) entry.traceId = this.context.traceId;
    if (this.context.commandType) entry.commandType = this.context.commandType;
    if (this.context.device) entry.device = this.context.device;
    if (this.context.ticket) entry.ticket = this.context.ticket;

    if (this.config.includeData && data) {
      var dataStr = JSON.stringify(data);
      if (dataStr.length > this.config.maxDataSize) {
        dataStr = dataStr.substring(0, this.config.maxDataSize) + "...[truncated]";
      }
      try {
        entry.data = JSON.parse(dataStr);
      } catch (e) {
        entry.data = { _error: "Failed to serialize data" };
      }
    }

    this.config.transport(entry);
  }

  private getTimestamp(): string {
    try {
      if (typeof Date !== "undefined" && Date.now) {
        return new Date(Date.now()).toISOString();
      }
    } catch (e) {
      // QtScript may not support Date.now()
    }
    return "pt-tick-" + ++PtLogger._tickCounter;
  }

  private static _tickCounter = 0;
}

var _rootLogger: PtLogger | null = null;

export function initializeLogger(config?: Partial<PtLoggerConfig>): PtLogger {
  _rootLogger = new PtLogger("pt-runtime", config);
  return _rootLogger;
}

export function getLogger(name?: string): PtLogger {
  if (!_rootLogger) {
    _rootLogger = initializeLogger();
  }
  if (name) {
    return _rootLogger.child({ logger: name });
  }
  return _rootLogger;
}
