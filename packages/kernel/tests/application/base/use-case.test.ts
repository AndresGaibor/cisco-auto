import { describe, expect, test } from 'bun:test';
import * as useCaseModule from '../../../src/application/use-cases/base/use-case.js';
import type { UseCase, UseCaseInput, UseCaseOutput } from '../../../src/application/use-cases/base/use-case.js';

class EchoUseCase implements UseCase<UseCaseInput, UseCaseOutput> {
  async execute(input: UseCaseInput): Promise<UseCaseOutput> {
    return { ...input, ejecutado: true };
  }
}

describe('UseCase', () => {
  test('exports the module', () => {
    expect(useCaseModule).toBeDefined();
  });

  test('can be implemented and executed', async () => {
    const useCase = new EchoUseCase();

    await expect(useCase.execute({ nombre: 'router' })).resolves.toEqual({
      nombre: 'router',
      ejecutado: true,
    });
  });
});
