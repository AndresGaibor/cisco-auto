import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { IosQueryOperations } from '../src/application/services/ios-query-operations.js';

describe('IosQueryOperations', () => {
  const mockGetSession = mock(() => ({}));
  const mockExecIos = mock(async (device: string, command: string) => {
    return { raw: '', interfaces: [] };
  });
  const mockGetDeviceModel = mock((device: string) => '2911');

  let queryOps: IosQueryOperations;

  beforeEach(() => {
    mockGetSession.mockClear();
    mockExecIos.mockClear();
    mockGetDeviceModel.mockClear();
    queryOps = new IosQueryOperations(mockGetSession, mockExecIos, mockGetDeviceModel);
  });

  describe('showIpInterfaceBrief', () => {
    test('calls execIos with show ip interface brief command', async () => {
      await queryOps.showIpInterfaceBrief('R1');

      expect(mockExecIos).toHaveBeenCalledWith('R1', 'show ip interface brief');
    });

    test('returns parsed ShowIpInterfaceBrief result', async () => {
      const mockResult = { interfaces: [{ name: 'Gi0/0', ip: '192.168.1.1' }] };
      mockExecIos.mockImplementation(async () => mockResult);

      const result = await queryOps.showIpInterfaceBrief('R1');

      expect(result).toEqual(mockResult);
    });
  });

  describe('showVlan', () => {
    test('calls execIos with show vlan command', async () => {
      await queryOps.showVlan('S1');

      expect(mockExecIos).toHaveBeenCalledWith('S1', 'show vlan');
    });
  });

  describe('showIpRoute', () => {
    test('calls execIos with show ip route command', async () => {
      await queryOps.showIpRoute('R1');

      expect(mockExecIos).toHaveBeenCalledWith('R1', 'show ip route');
    });
  });

  describe('showRunningConfig', () => {
    test('calls execIos with show running-config command', async () => {
      mockExecIos.mockImplementation(async () => ({ raw: 'config output' }));

      await queryOps.showRunningConfig('R1');

      expect(mockExecIos).toHaveBeenCalledWith('R1', 'show running-config');
    });

    test('truncates very large output', async () => {
      const largeConfig = 'x'.repeat(11_000_000);
      mockExecIos.mockImplementation(async () => ({ raw: largeConfig }));

      const result = await queryOps.showRunningConfig('R1');

      expect(result.raw.length).toBeLessThan(11_000_000);
      expect(result.raw).toContain('[TRUNCATED]');
    });
  });

  describe('show', () => {
    test('calls execIos with custom command', async () => {
      await queryOps.show('R1', 'show version');

      expect(mockExecIos).toHaveBeenCalledWith('R1', 'show version');
    });

    test('returns parsed output', async () => {
      const mockResult = { raw: 'version output', parsed: { version: '15.2' } };
      mockExecIos.mockImplementation(async () => mockResult);

      const result = await queryOps.show('R1', 'show version');

      expect(result).toEqual(mockResult);
    });
  });

  describe('resolveCapabilities', () => {
    test('calls getDeviceModel to resolve capabilities', async () => {
      await queryOps.resolveCapabilities('R1');

      expect(mockGetDeviceModel).toHaveBeenCalledWith('R1');
    });
  });
});