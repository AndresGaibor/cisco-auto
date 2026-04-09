import { expect, test, describe } from 'bun:test';
import { createStatusCommand } from '../src/commands/status.js';
import { createDoctorCommand } from '../src/commands/doctor.js';
import { COMMAND_CATALOG, getRegisteredCommandIds } from '../src/commands/command-catalog.js';

describe('Fase 5 registry and metadata', () => {
  test('status is registered in the catalog and command list', () => {
    expect(getRegisteredCommandIds()).toContain('status');
    expect(COMMAND_CATALOG.status).toBeDefined();
    expect(createStatusCommand().name()).toBe('status');
  });

  test('doctor is registered in the catalog and command list', () => {
    expect(getRegisteredCommandIds()).toContain('doctor');
    expect(COMMAND_CATALOG.doctor).toBeDefined();
    expect(createDoctorCommand().name()).toBe('doctor');
  });
});
