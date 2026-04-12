import type { UseCaseInput } from './use-case-input.js';
import type { UseCaseOutput } from './use-case-output.js';

export type { UseCaseInput } from './use-case-input.js';
export type { UseCaseOutput } from './use-case-output.js';

export interface UseCase<Input extends UseCaseInput = UseCaseInput, Output extends UseCaseOutput = UseCaseOutput> {
  execute(input: Input): Promise<Output>;
}
