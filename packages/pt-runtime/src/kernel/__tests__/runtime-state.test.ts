import { describe, expect, test } from 'bun:test';
import {
  createRuntimeState,
  resetRuntimeState,
  isValidRuntimeState,
  type RuntimeState,
} from '../runtime-state';

describe('runtime-state', () => {
  describe('createRuntimeState', () => {
    test('crea estado con version y fingerprint', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123');
      expect(state.version).toBe('1.0.0');
      expect(state.buildFingerprint).toBe('fp-abc123');
    });

    test('crea estado con valores iniciales correctos', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123');
      expect(state.bootstrapped).toBe(false);
      expect(state.cleaningUp).toBe(false);
      expect(state.runtimeLoaded).toBe(false);
      expect(state.lastRuntimeLoadAt).toBe(0);
      expect(state.tickTimer).toBeNull();
      expect(state.activeQueueItem).toBeNull();
      expect(state.terminalSubsystemReady).toBe(false);
      expect(state.lastError).toBeNull();
    });

    test('crea Maps vacios para watchers y listeners', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123');
      expect(state.watchers).toBeInstanceOf(Map);
      expect(state.listeners).toBeInstanceOf(Map);
      expect(state.watchers.size).toBe(0);
      expect(state.listeners.size).toBe(0);
    });

    test('crea heartbeatState y snapshotState inicializados', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123');
      expect(state.heartbeatState.active).toBe(false);
      expect(state.heartbeatState.intervalMs).toBe(0);
      expect(state.heartbeatState.lastBeatAt).toBe(0);
      expect(state.snapshotState.lastSnapshotAt).toBe(0);
      expect(state.snapshotState.pending).toBe(false);
    });
  });

  describe('resetRuntimeState', () => {
    test('resetea todos los campos a valores iniciales', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123');
      state.bootstrapped = true;
      state.runtimeLoaded = true;
      state.lastRuntimeLoadAt = Date.now();
      state.activeQueueItem = 'job-123';
      state.heartbeatState.active = true;
      state.terminalSubsystemReady = true;
      state.lastError = 'some error';

      resetRuntimeState(state);

      expect(state.bootstrapped).toBe(false);
      expect(state.cleaningUp).toBe(false);
      expect(state.runtimeLoaded).toBe(false);
      expect(state.lastRuntimeLoadAt).toBe(0);
      expect(state.tickTimer).toBeNull();
      expect(state.activeQueueItem).toBeNull();
      expect(state.heartbeatState.active).toBe(false);
      expect(state.terminalSubsystemReady).toBe(false);
      expect(state.lastError).toBeNull();
    });

    test('preserva version y fingerprint', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123');
      resetRuntimeState(state);
      expect(state.version).toBe('1.0.0');
      expect(state.buildFingerprint).toBe('fp-abc123');
    });
  });

  describe('isValidRuntimeState', () => {
    test('retorna true para estado valido', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123');
      expect(isValidRuntimeState(state)).toBe(true);
    });

    test('retorna false si version esta vacia', () => {
      const state = createRuntimeState('', 'fp-abc123');
      expect(isValidRuntimeState(state)).toBe(false);
    });

    test('retorna false si fingerprint esta vacio', () => {
      const state = createRuntimeState('1.0.0', '');
      expect(isValidRuntimeState(state)).toBe(false);
    });

    test('retorna false si watchers no es Map', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123') as any;
      state.watchers = {};
      expect(isValidRuntimeState(state)).toBe(false);
    });

    test('retorna false si listeners no es Map', () => {
      const state = createRuntimeState('1.0.0', 'fp-abc123') as any;
      state.listeners = {};
      expect(isValidRuntimeState(state)).toBe(false);
    });
  });
});