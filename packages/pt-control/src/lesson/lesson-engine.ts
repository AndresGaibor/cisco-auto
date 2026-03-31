import type { DeviceTwin } from "../contracts/twin-types.js";
import type { DeviceState } from "../contracts/snapshots.js";
import type { Lesson, Step, TheoryBlock, DemoStep } from "./curriculum-manager.js";

// ============================================================================
// LessonProgress — Tracks Execution State
// ============================================================================

export interface LessonProgress {
  lessonId: string;
  deviceName: string;
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  score: number;
  maxScore: number;
  status: "not_started" | "running" | "paused" | "completed" | "failed";
  stepResults: StepResult[];
  startedAt: number | null;
  completedAt: number | null;
  pausedAt: number | null;
}

// ============================================================================
// StepResult — Result of Executing a Single Step
// ============================================================================

export interface StepResult {
  stepId: string;
  stepIndex: number;
  success: boolean;
  output: string;
  error: string | null;
  duration: number;
  timestamp: number;
}

/**
 * LessonEngine executes lessons step-by-step on a device.
 *
 * Provides an AsyncGenerator interface for streaming progress updates
 * while executing lesson steps. Supports pause/resume/reset operations.
 */
export class LessonEngine {
  private progress: LessonProgress | null = null;
  private paused: boolean = false;
  private aborted: boolean = false;
  private commandExecutor: LessonCommandExecutor | null = null;

  constructor(executor?: LessonCommandExecutor) {
    this.commandExecutor = executor ?? null;
  }

  /**
   * Execute a lesson step-by-step, yielding progress updates.
   */
  async *execute(
    lesson: Lesson,
    device: DeviceTwin | DeviceState
  ): AsyncGenerator<LessonProgress> {
    // Initialize progress state
    const deviceName = "name" in device ? device.name : (device as DeviceState).displayName ?? "unknown";
    this.progress = {
      lessonId: lesson.id,
      deviceName,
      currentStepIndex: 0,
      totalSteps: lesson.steps.length,
      completedSteps: 0,
      score: 0,
      maxScore: lesson.steps.length,
      status: "running",
      stepResults: [],
      startedAt: Date.now(),
      completedAt: null,
      pausedAt: null,
    };
    this.paused = false;
    this.aborted = false;

    yield this.progress;

    for (let i = 0; i < lesson.steps.length; i++) {
      // Check for pause/abort
      if (this.aborted) {
        this.progress.status = "failed";
        yield this.progress;
        return;
      }

      while (this.paused && !this.aborted) {
        this.progress.pausedAt = Date.now();
        yield this.progress;
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (this.aborted) {
        this.progress.status = "failed";
        yield this.progress;
        return;
      }

      const step = lesson.steps[i]!;
      this.progress.currentStepIndex = i;
      yield this.progress;

      // Execute the step
      const result = await this.executeStep(step, device);
      this.progress.stepResults.push(result);

      if (result.success) {
        this.progress.completedSteps++;
        this.progress.score++;
      } else {
        // Decide whether to continue or stop based on step type
        // For now, continue on failure but don't increment score
      }

      yield this.progress;
    }

    this.progress.status = "completed";
    this.progress.completedAt = Date.now();
    yield this.progress;
  }

  /**
   * Pause lesson execution.
   */
  pause(): void {
    this.paused = true;
    if (this.progress) {
      this.progress.status = "paused";
    }
  }

  /**
   * Resume lesson execution.
   */
  resume(): void {
    this.paused = false;
    if (this.progress) {
      this.progress.status = "running";
    }
  }

  /**
   * Reset lesson execution state.
   */
  reset(): void {
    this.paused = false;
    this.aborted = false;
    this.progress = null;
  }

  /**
   * Abort lesson execution.
   */
  abort(): void {
    this.aborted = true;
    this.paused = false;
  }

  /**
   * Get current progress.
   */
  getProgress(): LessonProgress | null {
    return this.progress;
  }

  /**
   * Check if engine is paused.
   */
  isPaused(): boolean {
    return this.paused;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async executeStep(step: Step, device: DeviceTwin | DeviceState): Promise<StepResult> {
    const startTime = Date.now();

    if (step.type === "theory") {
      // Theory blocks don't require execution, just acknowledgment
      return {
        stepId: step.id,
        stepIndex: this.progress?.currentStepIndex ?? 0,
        success: true,
        output: `Theory block: ${step.title ?? step.id}`,
        error: null,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    // Demo step execution
    const demoStep = step as DemoStep;

    if (!demoStep.command) {
      // Informational step with no command
      return {
        stepId: demoStep.id,
        stepIndex: this.progress?.currentStepIndex ?? 0,
        success: true,
        output: demoStep.description,
        error: null,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    // Execute the command if we have an executor
    if (this.commandExecutor) {
      try {
        const output = await this.commandExecutor.executeCommand(device, demoStep.command);
        const success = demoStep.expectedOutput
          ? output.includes(demoStep.expectedOutput)
          : true;

        return {
          stepId: demoStep.id,
          stepIndex: this.progress?.currentStepIndex ?? 0,
          success,
          output,
          error: success ? null : `Expected output not found: ${demoStep.expectedOutput}`,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      } catch (e) {
        return {
          stepId: demoStep.id,
          stepIndex: this.progress?.currentStepIndex ?? 0,
          success: false,
          output: "",
          error: e instanceof Error ? e.message : String(e),
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      }
    }

    // No executor available - simulate execution
    return {
      stepId: demoStep.id,
      stepIndex: this.progress?.currentStepIndex ?? 0,
      success: true,
      output: `[Simulated] ${demoStep.command}`,
      error: null,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// LessonCommandExecutor — Abstraction for Command Execution
// ============================================================================

/**
 * LessonCommandExecutor abstracts the actual command execution,
 * allowing the LessonEngine to work with different device types
 * (real devices via SSH, simulated devices, etc.)
 */
export interface LessonCommandExecutor {
  /**
   * Execute a command on a device and return the output.
   */
  executeCommand(device: DeviceTwin | DeviceState, command: string): Promise<string>;
}

// ============================================================================
// DefaultSimulatedExecutor — Simulated Executor for Testing
// ============================================================================

/**
 * DefaultSimulatedExecutor provides simulated command execution
 * for testing or when no real device connection is available.
 */
export class DefaultSimulatedExecutor implements LessonCommandExecutor {
  async executeCommand(device: DeviceTwin | DeviceState, command: string): Promise<string> {
    // Simulate command execution delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const deviceName = "name" in device ? device.name : (device as DeviceState).displayName ?? "unknown";

    // Return simulated output based on command
    if (command.startsWith("show")) {
      return `${deviceName}# ${command}\nInterface Status\nProtocol\nGi0/0 up up`;
    }
    if (command.startsWith("config")) {
      return `${deviceName}(config)# ${command}`;
    }
    if (command === "end") {
      return `${deviceName}#`;
    }
    if (command === "exit") {
      return `${deviceName}#`;
    }

    return `${deviceName}# ${command}\nOK`;
  }
}
