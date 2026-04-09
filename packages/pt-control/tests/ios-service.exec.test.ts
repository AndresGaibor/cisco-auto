import { expect, test, describe } from 'bun:test';
import { IosService } from '../src/application/services/ios-service.js';
import type { FileBridgePort } from '../src/application/ports/file-bridge.port.js';

function makeBridge(responseMap: Record<string, any>) {
  return {
    sendCommandAndWait: async (type: string, _payload: any, _timeout?: number) => {
      const key = type;
      const value = responseMap[key];
      return { value: value ?? { ok: true, raw: '', source: 'terminal' } };
    },
    start: () => {},
    stop: async () => {},
    readState: () => null,
    getStateSnapshot: () => null,
    getHeartbeat: () => null,
    getHeartbeatHealth: () => ({ state: 'unknown' as const }),
    getBridgeStatus: () => ({ ready: true }),
    getContext: () => ({ bridgeReady: true, heartbeat: { state: 'unknown' } }),
    on: () => ({}) as any,
    onAll: () => () => {},
    loadRuntime: async () => {},
    loadRuntimeFromFile: async () => {},
    isReady: () => true,
  } as unknown as FileBridgePort;
}

const mockInspect = async () => ({ model: '2911', name: 'R1', type: 'router' } as any);
const generateId = () => 'test_123';

describe('execIos()', () => {
  test('falls if source !== terminal', async () => {
    const bridge = makeBridge({
      execIos: { ok: true, raw: 'output', source: 'synthetic' },
    });
    const svc = new IosService(bridge, generateId, mockInspect);
    await expect(svc.execIos('R1', 'show version')).rejects.toThrow('synthetic');
  });

  test('falls if ok === false', async () => {
    const bridge = makeBridge({
      execIos: { ok: false, error: 'command failed', code: 'ERR_001' },
    });
    const svc = new IosService(bridge, generateId, mockInspect);
    await expect(svc.execIos('R1', 'bad-command')).rejects.toThrow('execIos failed');
  });

  test('devuelve evidencia uniforme con source terminal', async () => {
    const bridge = makeBridge({
      execIos: {
        ok: true,
        raw: 'test output',
        source: 'terminal',
        session: { mode: 'priv-exec', prompt: 'R1#' },
        diagnostics: { source: 'terminal', completionReason: 'command-ended' },
      },
    });
    const svc = new IosService(bridge, generateId, mockInspect);
    const result = await svc.execIos('R1', 'show version');
    expect(result.ok).toBe(true);
    expect(result.raw).toBe('test output');
    expect(result.evidence.source).toBe('terminal');
    expect(result.evidence.mode).toBe('priv-exec');
    expect(result.evidence.prompt).toBe('R1#');
  });
});

describe('execInteractive()', () => {
  test('falls if source !== terminal', async () => {
    const bridge = makeBridge({
      execInteractive: { ok: true, raw: 'output', source: 'synthetic' },
    });
    const svc = new IosService(bridge, generateId, mockInspect);
    await expect(svc.execInteractive('R1', 'show running-config')).rejects.toThrow('synthetic');
  });

  test('devuelve evidencia con session info', async () => {
    const bridge = makeBridge({
      execInteractive: {
        ok: true,
        raw: 'config output',
        source: 'terminal',
        session: { mode: 'config', prompt: 'R1(config)#', paging: false },
        diagnostics: { source: 'terminal', completionReason: 'command-ended' },
      },
    });
    const svc = new IosService(bridge, generateId, mockInspect);
    const result = await svc.execInteractive('R1', 'show run');
    expect(result.ok).toBe(true);
    expect(result.evidence.source).toBe('terminal');
    expect(result.evidence.mode).toBe('config');
  });
});

describe('configIos()', () => {
  test('devuelve IosConfigApplyResult', async () => {
    const bridge = makeBridge({
      configIos: {
        ok: true,
        source: 'terminal',
        session: { mode: 'priv-exec' },
        diagnostics: { source: 'terminal', completionReason: 'command-ended' },
      },
    });
    const svc = new IosService(bridge, generateId, mockInspect);
    const result = await svc.configIos('R1', ['hostname R1', 'no ip domain-lookup']);
    expect(result.executed).toBe(true);
    expect(result.device).toBe('R1');
    expect(result.commands).toEqual(['hostname R1', 'no ip domain-lookup']);
    expect(result.evidence.source).toBe('terminal');
  });

  test('falls si source es synthetic', async () => {
    const bridge = makeBridge({
      configIos: { ok: true, source: 'synthetic' },
    });
    const svc = new IosService(bridge, generateId, mockInspect);
    await expect(svc.configIos('R1', ['hostname X'])).rejects.toThrow('synthetic');
  });
});
