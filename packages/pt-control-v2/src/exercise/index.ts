// Exercise Mode — Lab exercises with objectives, tasks, and progressive hints

export {
  // Hint types and helpers
  type HintLevel,
  type Hint,
  createHint,
  vagueHint,
  moderateHint,
  explicitHint,
} from "./hint.js";

export {
  // Lab exercise definition
  type Objective,
  type TaskSpec,
  type ExerciseTask,
  type Constraint,
  type LabExercise,
  createLabExercise,
  createObjective,
  createTask,
  createConstraint,
} from "./lab-exercise.js";

export {
  // Exercise engine
  type ExerciseEvent,
  type ValidationResult,
  type AttemptResult,
  type ExerciseState,
  type ExerciseSummary,
  type CommandExecutor,
  ExerciseEngine,
} from "./exercise-engine.js";

export {
  // Tutor engine
  type TutorAttemptResult,
  type HintRepository,
  TutorEngine,
} from "./tutor-engine.js";
