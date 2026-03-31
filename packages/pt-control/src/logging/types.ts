/**
 * Tipos de logging para PT Control v2.
 * Cada LogEntry corresponde a una línea NDJSON.
 */

/**
 * Entrada de log - formato principal registrado en events.ndjson
 */
export interface LogEntry {
  // Identificador de sesión que agrupa operaciones relacionadas
  session_id: string;

  // ID de correlación para trazar operaciones individuales
  correlation_id: string;

  // Marca de tiempo: puede ser epoch (number) o ISO (string)
  timestamp: number | string;

  // Acción realizada (por ejemplo: "device:list", "deploy:config")
  action: string;

  // Dispositivo objetivo (si aplica)
  target_device?: string;

  // Resultado de la acción
  outcome: 'success' | 'error' | 'cancelled' | 'pending' | 'failure';

  // Duración en milisegundos si es medible
  duration_ms?: number;

  // Mensaje de error cuando outcome === 'failure'
  error?: string;

  // Metadatos arbitrarios para enriquecer la entrada (NDJSON-friendly)
  metadata?: Record<string, unknown>;

  context?: Record<string, unknown>;

  is_destructive?: boolean;

  confirmation_status?: 'cancelled' | 'confirmed' | 'timeout' | 'not_required';
}

/**
 * Seguimiento de sesiones para agrupar entradas relacionadas
 */
export interface LogSession {
  // Identificador único de la sesión
  id: string;

  // Timestamp de inicio (epoch o ISO)
  started_at: number | string;

  // Timestamp de fin si la sesión concluyó
  ended_at?: number | string;

  // Entradas asociadas a la sesión
  entries: LogEntry[];
}

/**
 * Configuración para el gestor de logs (LogManager)
 */
export interface LogConfig {
  // Directorio donde se almacenan los archivos de log
  logDir: string;

  // Retención en días antes de rotar/borrar archivos
  retentionDays: number;

  // Prefijo para nombres de archivo (ej: "pt-control-events")
  prefix?: string;
}

/**
 * Opciones para consultas simples sobre los logs
 */
export interface LogQueryOptions {
  session_id?: string;
  action?: string;
  outcome?: LogEntry['outcome'];
  target_device?: string;
  from?: number | string;
  to?: number | string;
  limit?: number;
}

/**
 * Estadísticas básicas sobre los archivos de log
 */
export interface LogStats {
  fileCount: number;
  totalSize: number;
  oldestFile?: number | string;
  newestFile?: number | string;
  totalEntries: number;
}
