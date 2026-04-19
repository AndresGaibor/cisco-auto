import { describe, expect, test } from 'bun:test';
import { createRuntimeState } from '../runtime-state';
import {
  createDispatchLoop,
  isDispatchLoopActive,
  stopDispatchLoop,
  type DispatchLoopConfig,
} from '../dispatch-loop';

describe('dispatch-loop', () => {
  const createTestState = () => createRuntimeState('1.0.0', 'fp-test');

  describe('createDispatchLoop', () => {
    test('crea loop con config valida', () => {
      const state = createTestState();
      state.bootstrapped = true;

      const config: DispatchLoopConfig = {
        pollIntervalMs: 100,
        maxConcurrentCommands: 5,
      };

      const loop = createDispatchLoop(state, config);
      expect(loop.isActive()).toBe(true);
    });

    test('readNextJob retorna null cuando no esta activo', () => {
      const state = createTestState();
      state.bootstrapped = false;

      const config: DispatchLoopConfig = { pollIntervalMs: 100, maxConcurrentCommands: 5 };
      const loop = createDispatchLoop(state, config);

      const job = loop.readNextJob();
      expect(job).toBeNull();
    });

    test('delegateToRuntime retorna error si runtime no cargado', () => {
      const state = createTestState();
      state.bootstrapped = true;
      state.runtimeLoaded = false;

      const config: DispatchLoopConfig = { pollIntervalMs: 100, maxConcurrentCommands: 5 };
      const loop = createDispatchLoop(state, config);

      const result = loop.delegateToRuntime({ type: 'test' });
      expect(result).toEqual({ error: 'runtime-not-loaded' });
    });

    test('clearExecutionState limpia activeQueueItem', () => {
      const state = createTestState();
      state.bootstrapped = true;
      state.activeQueueItem = 'job-123';

      const config: DispatchLoopConfig = { pollIntervalMs: 100, maxConcurrentCommands: 5 };
      const loop = createDispatchLoop(state, config);

      loop.clearExecutionState();
      expect(state.activeQueueItem).toBeNull();
    });

    test('maintainHeartbeat actualiza lastBeatAt cuando activo', () => {
      const state = createTestState();
      state.bootstrapped = true;
      state.heartbeatState.active = true;

      const config: DispatchLoopConfig = { pollIntervalMs: 100, maxConcurrentCommands: 5 };
      const loop = createDispatchLoop(state, config);

      const before = state.heartbeatState.lastBeatAt;
      loop.maintainHeartbeat();
      expect(state.heartbeatState.lastBeatAt).toBeGreaterThanOrEqual(before);
    });

    test('stop desactiva el loop', () => {
      const state = createTestState();
      state.bootstrapped = true;

      const config: DispatchLoopConfig = { pollIntervalMs: 100, maxConcurrentCommands: 5 };
      const loop = createDispatchLoop(state, config);

      expect(loop.isActive()).toBe(true);
      loop.stop();
      expect(loop.isActive()).toBe(false);
    });
  });

  describe('isDispatchLoopActive', () => {
    test('retorna true cuando bootstrapped y tickTimer activo', () => {
      const state = createTestState();
      state.bootstrapped = true;
      state.cleaningUp = false;
      state.tickTimer = 123;

      expect(isDispatchLoopActive(state)).toBe(true);
    });

    test('retorna false cuando cleaningUp', () => {
      const state = createTestState();
      state.bootstrapped = true;
      state.cleaningUp = true;
      state.tickTimer = 123;

      expect(isDispatchLoopActive(state)).toBe(false);
    });

    test('retorna false cuando tickTimer es null', () => {
      const state = createTestState();
      state.bootstrapped = true;
      state.cleaningUp = false;
      state.tickTimer = null;

      expect(isDispatchLoopActive(state)).toBe(false);
    });
  });

  describe('stopDispatchLoop', () => {
    test('detiene el loop limpiando tickTimer y setting cleaningUp', () => {
      const state = createTestState();
      state.bootstrapped = true;
      state.tickTimer = 123;

      stopDispatchLoop(state);

      expect(state.tickTimer).toBeNull();
      expect(state.cleaningUp).toBe(true);
    });
  });
});