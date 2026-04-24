/**
 * Checkpoint de posición de un consumer NDJSON.
 */
export interface ConsumerCheckpoint {
  /** ID del consumer */
  consumerId: string;
  /** Archivo actual en lectura (path relativo) */
  currentFile: string;
  /** Offset en bytes dentro del archivo */
  byteOffset: number;
  /** Último seq procesado */
  lastSeq: number;
  /** Timestamp de última actualización */
  updatedAt: number;
}

/**
 * Entrada en el manifest de rotación de logs.
 */
export interface RotationEntry {
  /** Nombre del archivo rotado */
  file: string;
  /** Timestamp cuando se rotó */
  rotatedAt: number;
  /** Nombre del archivo antes de rotación */
  previousFile: string;
  /** Tamaño en bytes al momento de rotación */
  bytesSizeAtRotation: number;
  /** Último seq contenido en el archivo */
  lastSeqInFile: number;
  /** Primer seq en el archivo (opcional) */
  firstSeqInFile?: number;
  /** Cantidad de registros (opcional) */
  recordCount?: number;
  /** Bytes del archivo (opcional) */
  bytes?: number;
  /** Timestamp de creación (opcional) */
  createdAt?: number;
  /** Timestamp cuando se cerró (opcional) */
  closedAt?: number;
}

/**
 * Manifest que indexa archivos de log rotados.
 */
export interface RotationManifest {
  /** Lista de entradas de rotación */
  rotations: RotationEntry[];
}

/**
 * Recovery info para comandos in-flight encontrados tras crash.
 */
export interface InFlightRecovery {
  /** Path del archivo */
  file: string;
  /** ID del comando */
  cmdId: string;
  /** Seq del comando */
  seq: number;
  /** Tipo del comando */
  type: string;
  /** Número de intento */
  attempt: number;
  /** Timestamp cuando se movió */
  movedAt: number;
  /** Acción tomada: requeued, completed, o dead-letter */
  action: "requeued" | "completed" | "dead-letter";
}

/** Estados posibles de un comando */
export type CommandStatus = "queued" | "picked" | "started" | "completed" | "failed";

/**
 * Envelope de archivo de comando con status.
 */
export interface CommandFileEnvelope<T = unknown> {
  /** Estado actual del comando */
  status: CommandStatus;
  /** Payload del comando */
  payload: T;
}
