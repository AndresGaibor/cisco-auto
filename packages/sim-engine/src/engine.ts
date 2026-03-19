/**
 * @cisco-auto/sim-engine
 * 
 * Motor de simulación de eventos discretos (DES) determinista.
 * 
 * Características:
 * - Tiempo virtual
 * - Orden total de eventos (at, priority, sequence)
 * - Scheduler determinista
 * - Snapshots y replay reproducible
 */

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Evento de simulación
 */
export interface SimEvent {
  /** ID único del evento */
  id: string;
  
  /** Tiempo virtual de ejecución */
  at: number;
  
  /** Prioridad (menor = más prioritario) */
  priority: number;
  
  /** Número de secuencia para desempate */
  sequence: number;
  
  /** Tipo de evento */
  type: string;
  
  /** Payload del evento */
  payload: unknown;
  
  /** Dispositivo origen (opcional) */
  sourceDevice?: string;
  
  /** Dispositivo destino (opcional) */
  targetDevice?: string;
}

/**
 * Resultado de un paso de simulación
 */
export interface StepResult {
  /** Evento procesado */
  event: SimEvent | null;
  
  /** Tiempo actual */
  now: number;
  
  /** Eventos restantes en la cola */
  pendingEvents: number;
  
  /** ¿Simulación terminada? */
  finished: boolean;
}

/**
 * Resultado de correr hasta un tiempo
 */
export interface RunResult {
  /** Eventos procesados */
  eventsProcessed: number;
  
  /** Tiempo final */
  endTime: number;
  
  /** ¿Terminó por tiempo o por cola vacía? */
  reason: 'time_reached' | 'no_events';
}

// =============================================================================
// EVENT COMPARATOR
// =============================================================================

/**
 * Comparador de eventos para orden total
 * Orden: at (asc) -> priority (asc) -> sequence (asc)
 */
export function compareEvents(a: SimEvent, b: SimEvent): number {
  if (a.at !== b.at) return a.at - b.at;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.sequence - b.sequence;
}

// =============================================================================
// SCHEDULER
// =============================================================================

/**
 * Scheduler de eventos usando un heap binario
 */
export class EventScheduler {
  private heap: SimEvent[] = [];
  private sequenceCounter: number = 0;
  
  /**
   * Número de eventos pendientes
   */
  get size(): number {
    return this.heap.length;
  }
  
  /**
   * ¿Está vacío?
   */
  get isEmpty(): boolean {
    return this.heap.length === 0;
  }
  
  /**
   * Siguiente evento sin removerlo
   */
  peek(): SimEvent | null {
    return this.heap[0] || null;
  }
  
  /**
   * Agenda un evento
   */
  schedule(event: Omit<SimEvent, 'id' | 'sequence'>): SimEvent {
    const fullEvent: SimEvent = {
      ...event,
      id: this.generateId(),
      sequence: this.sequenceCounter++
    };
    
    this.heapPush(fullEvent);
    return fullEvent;
  }
  
  /**
   * Remueve y retorna el siguiente evento
   */
  next(): SimEvent | null {
    if (this.isEmpty) return null;
    return this.heapPop();
  }
  
  /**
   * Cancela un evento por ID
   */
  cancel(eventId: string): boolean {
    const index = this.heap.findIndex(e => e.id === eventId);
    if (index === -1) return false;
    
    // Remover del heap
    this.heap.splice(index, 1);
    
    // Re-heapificar
    this.heapify();
    
    return true;
  }
  
  /**
   * Cancela todos los eventos de un tipo
   */
  cancelByType(type: string): number {
    const initialSize = this.heap.length;
    this.heap = this.heap.filter(e => e.type !== type);
    this.heapify();
    return initialSize - this.heap.length;
  }
  
  /**
   * Obtiene todos los eventos pendientes (ordenados)
   */
  getAllEvents(): SimEvent[] {
    return [...this.heap].sort(compareEvents);
  }
  
  /**
   * Limpia todos los eventos
   */
  clear(): void {
    this.heap = [];
    this.sequenceCounter = 0;
  }
  
  /**
   * Serializa el estado del scheduler
   */
  serialize(): { heap: SimEvent[]; sequenceCounter: number } {
    return {
      heap: [...this.heap],
      sequenceCounter: this.sequenceCounter
    };
  }
  
  /**
   * Restaura el estado del scheduler
   */
  restore(state: { heap: SimEvent[]; sequenceCounter: number }): void {
    this.heap = [...state.heap];
    this.sequenceCounter = state.sequenceCounter;
    this.heapify();
  }
  
  // === Heap Operations ===
  
  private heapPush(event: SimEvent): void {
    this.heap.push(event);
    this.siftUp(this.heap.length - 1);
  }
  
  private heapPop(): SimEvent {
    const result = this.heap[0];
    const last = this.heap.pop()!;
    
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    
    return result;
  }
  
  private siftUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareEvents(this.heap[index], this.heap[parent]) >= 0) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
  }
  
  private siftDown(index: number): void {
    const length = this.heap.length;
    
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;
      
      if (left < length && compareEvents(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      
      if (right < length && compareEvents(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      
      if (smallest === index) break;
      
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
  
  private heapify(): void {
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.siftDown(i);
    }
  }
  
  private generateId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// SIMULATION ENGINE
// =============================================================================

/**
 * Handler de eventos
 */
export type EventHandler = (event: SimEvent, engine: SimEngine) => void | Promise<void>;

/**
 * Tipo de snapshot serializable
 */
export interface Snapshot {
  /** Tiempo del snapshot */
  at: number;
  
  /** Semilla usada */
  seed: number;
  
  /** Estado del scheduler */
  scheduler: ReturnType<EventScheduler['serialize']>;
  
  /** Estado adicional del runtime */
  runtime?: unknown;
}

/**
 * Configuración del motor
 */
export interface SimEngineConfig {
  /** Semilla para aleatoriedad determinista */
  seed?: number;
  
  /** Tiempo máximo de simulación */
  maxTime?: number;
  
  /** Handlers de eventos */
  handlers?: Map<string, EventHandler>;
}

/**
 * Motor de simulación de eventos discretos
 */
export class SimEngine {
  private scheduler: EventScheduler;
  private currentTime: number = 0;
  private seed: number;
  private randomState: number;
  private handlers: Map<string, EventHandler>;
  private maxTime: number;
  
  // Estadísticas
  private eventsProcessed: number = 0;
  
  constructor(config: SimEngineConfig = {}) {
    this.scheduler = new EventScheduler();
    this.seed = config.seed ?? Date.now();
    this.randomState = this.seed;
    this.handlers = config.handlers || new Map();
    this.maxTime = config.maxTime ?? Infinity;
  }
  
  // === Estado ===
  
  /**
   * Tiempo actual de simulación
   */
  now(): number {
    return this.currentTime;
  }
  
  /**
   * Semilla de la simulación
   */
  getSeed(): number {
    return this.seed;
  }
  
  /**
   * Número de eventos procesados
   */
  getEventsProcessed(): number {
    return this.eventsProcessed;
  }
  
  /**
   * Eventos pendientes en la cola
   */
  getPendingEvents(): number {
    return this.scheduler.size;
  }
  
  // === Control ===
  
  /**
   * Agenda un evento
   */
  schedule(event: Omit<SimEvent, 'id' | 'sequence'>): SimEvent {
    return this.scheduler.schedule(event);
  }
  
  /**
   * Cancela un evento
   */
  cancel(eventId: string): boolean {
    return this.scheduler.cancel(eventId);
  }
  
  /**
   * Registra un handler para un tipo de evento
   */
  registerHandler(type: string, handler: EventHandler): void {
    this.handlers.set(type, handler);
  }
  
  /**
   * Procesa un único evento
   */
  step(): StepResult {
    const event = this.scheduler.next();
    
    if (event) {
      this.currentTime = event.at;
      this.eventsProcessed++;
      
      // Ejecutar handler si existe
      const handler = this.handlers.get(event.type);
      if (handler) {
        handler(event, this);
      }
    }
    
    return {
      event,
      now: this.currentTime,
      pendingEvents: this.scheduler.size,
      finished: this.scheduler.isEmpty
    };
  }
  
  /**
   * Corre la simulación hasta un tiempo específico
   */
  runUntil(time: number): RunResult {
    let eventsProcessed = 0;
    
    while (!this.scheduler.isEmpty) {
      const next = this.scheduler.peek();
      
      if (!next || next.at > time) {
        break;
      }
      
      this.step();
      eventsProcessed++;
      
      // Verificar tiempo máximo
      if (this.currentTime > this.maxTime) {
        break;
      }
    }
    
    this.currentTime = Math.max(this.currentTime, time);
    
    return {
      eventsProcessed,
      endTime: this.currentTime,
      reason: this.scheduler.isEmpty ? 'no_events' : 'time_reached'
    };
  }
  
  /**
   * Corre la simulación hasta que no haya más eventos
   */
  runAll(): RunResult {
    let eventsProcessed = 0;
    
    while (!this.scheduler.isEmpty) {
      const result = this.step();
      eventsProcessed++;
      
      // Verificar tiempo máximo
      if (this.currentTime > this.maxTime) {
        break;
      }
      
      if (result.finished) break;
    }
    
    return {
      eventsProcessed,
      endTime: this.currentTime,
      reason: this.scheduler.isEmpty ? 'no_events' : 'time_reached'
    };
  }
  
  // === Snapshot / Restore ===
  
  /**
   * Crea un snapshot del estado actual
   */
  snapshot(runtimeState?: unknown): Snapshot {
    return {
      at: this.currentTime,
      seed: this.seed,
      scheduler: this.scheduler.serialize(),
      runtime: runtimeState
    };
  }
  
  /**
   * Restaura desde un snapshot
   */
  restore(snapshot: Snapshot): void {
    this.currentTime = snapshot.at;
    this.seed = snapshot.seed;
    this.randomState = snapshot.seed;
    this.scheduler.restore(snapshot.scheduler);
    this.eventsProcessed = 0;
  }
  
  // === Aleatoriedad determinista ===
  
  /**
   * Genera un número aleatorio determinista (0-1)
   */
  random(): number {
    // Usar algoritmo LCG (Linear Congruential Generator)
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;
    
    this.randomState = (a * this.randomState + c) % m;
    return this.randomState / m;
  }
  
  /**
   * Genera un entero aleatorio en un rango
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  
  /**
   * Genera un MAC aleatorio
   */
  randomMAC(): string {
    const bytes = Array.from({ length: 6 }, () => 
      Math.floor(this.random() * 256).toString(16).padStart(2, '0')
    );
    return bytes.join(':');
  }
  
  // === Utilidades ===
  
  /**
   * Resetea la simulación
   */
  reset(seed?: number): void {
    this.scheduler.clear();
    this.currentTime = 0;
    this.seed = seed ?? Date.now();
    this.randomState = this.seed;
    this.eventsProcessed = 0;
  }
}
