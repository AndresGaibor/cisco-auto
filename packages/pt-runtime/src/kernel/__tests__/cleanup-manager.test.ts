import { describe, expect, test } from 'bun:test';
import { createRuntimeState } from '../runtime-state';
import {
  createCleanupManager,
  isIdempotentClean,
  safeCleanup,
  type CleanupStageName,
} from '../cleanup-manager';

describe('cleanup-manager', () => {
  const createTestState = () => {
    const state = createRuntimeState('1.0.0', 'fp-test');
    state.bootstrapped = true;
    state.tickTimer = 123;
    state.activeQueueItem = 'job-123';
    state.watchers.set('w1', {});
    state.listeners.set('l1', []);
    state.terminalSubsystemReady = true;
    return state;
  };

  describe('createCleanupManager', () => {
    test('crea manager con estado inicial', () => {
      const state = createTestState();
      const manager = createCleanupManager(state);

      const managerState = manager.getState();
      expect(managerState.started).toBe(false);
      expect(managerState.currentStage).toBeNull();
      expect(managerState.stages.length).toBe(6);
    });

    test('begin inicia cleanup y resetea stages', () => {
      const state = createTestState();
      const manager = createCleanupManager(state);

      manager.begin();
      const managerState = manager.getState();

      expect(managerState.started).toBe(true);
      expect(state.cleaningUp).toBe(true);
      managerState.stages.forEach((s) => {
        expect(s.completed).toBe(false);
      });
    });

    test('advance marca stage como completado', () => {
      const state = createTestState();
      const manager = createCleanupManager(state);

      manager.begin();
      manager.advance('stop-timers');

      const managerState = manager.getState();
      const stopTimersStage = managerState.stages.find((s) => s.name === 'stop-timers');
      expect(stopTimersStage?.completed).toBe(true);
    });

    test('execute realiza cleanup completo', () => {
      const state = createTestState();
      const manager = createCleanupManager(state);

      const result = manager.execute();

      expect(result.success).toBe(true);
      expect(result.stages.length).toBe(6);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      result.stages.forEach((s) => {
        expect(s.completed).toBe(true);
      });
    });

    test('execute limpia recursos del estado', () => {
      const state = createTestState();
      const manager = createCleanupManager(state);

      manager.execute();

      expect(state.tickTimer).toBeNull();
      expect(state.watchers.size).toBe(0);
      expect(state.listeners.size).toBe(0);
      expect(state.terminalSubsystemReady).toBe(false);
      expect(state.activeQueueItem).toBeNull();
      expect(state.bootstrapped).toBe(false);
      expect(state.cleaningUp).toBe(false);
    });

    test('advance ignora stage desconocido', () => {
      const state = createTestState();
      const manager = createCleanupManager(state);

      manager.begin();
      manager.advance('unknown-stage' as CleanupStageName);

      const managerState = manager.getState();
      const unknownStage = managerState.stages.find((s) => s.name === 'unknown-stage');
      expect(unknownStage).toBeUndefined();
    });
  });

  describe('isIdempotentClean', () => {
    test('retorna true ( idempotente )', () => {
      expect(isIdempotentClean()).toBe(true);
    });
  });

  describe('safeCleanup', () => {
    test('cleanup exitoso retorna result con success true', () => {
      const state = createTestState();
      const result = safeCleanup(state);

      expect(result.success).toBe(true);
      expect(result.stages.length).toBe(6);
      expect(result.error).toBeUndefined();
    });

    test('cleanup con estado ya limpio funciona', () => {
      const state = createRuntimeState('1.0.0', 'fp-test');
      state.bootstrapped = false;
      state.cleaningUp = false;

      const result = safeCleanup(state);
      expect(result.success).toBe(true);
    });

    test('cleanup no relanza excepciones fatales', () => {
      const state = createTestState();
      const originalError = console.error;
      let errorThrown = false;

      try {
        const result = safeCleanup(state);
        expect(result.success).toBe(true);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
    });
  });
});