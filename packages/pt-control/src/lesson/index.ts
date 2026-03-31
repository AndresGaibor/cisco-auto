// ============================================================================
// Lesson Mode — Exports
// ============================================================================

export {
  CurriculumManager,
  type Curriculum,
  type Lesson,
  type TheoryBlock,
  type DemoStep,
  type Step,
} from "./curriculum-manager.js";

export {
  LessonEngine,
  type LessonCommandExecutor,
  DefaultSimulatedExecutor,
  type LessonProgress,
  type StepResult,
} from "./lesson-engine.js";

export {
  TheoryBlockRenderer,
  createTheoryBlockRenderer,
  DiagramTemplates,
} from "./theory-block.js";

export {
  DemoStepPlayer,
  DemoSequencePlayer,
  createDemoStepPlayer,
  type DemoProgress,
} from "./demo-step.js";
