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
  command_ids?: string[];

  // Campos para tracing extremo a extremo
  phase?: string;
  parent_correlation_id?: string;
  argv?: string[];
  flags?: Record<string, unknown>;
  payload_preview?: Record<string, unknown>;
  result_preview?: Record<string, unknown>;
  bridge_events?: unknown[];
  pt_runtime_trace_path?: string;
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

/**
 * Claves sensibles que deben ser redactadas en los logs
 */
const SENSITIVE_KEYS = ['password', 'secret', 'community', 'key', 'token', 'credential', 'auth'];

/**
 * Redacta valores sensibles de un objeto para evitar que aparezcan en logs
 * @param obj - Objeto a redactar
 * @returns Objeto con valores sensibles reemplazados por '***'
 */
export function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitive(item));
  }

  const result: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));

    if (isSensitive && typeof value === 'string' && value.length > 0) {
      result[key] = '***';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
