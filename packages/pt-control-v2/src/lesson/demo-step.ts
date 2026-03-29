import type { DemoStep as DemoStepType } from "./curriculum-manager.js";

// ============================================================================
// DemoStepPlayer — Plays Pre-recorded Demonstration Steps
// ============================================================================

/**
 * DemoStepPlayer handles playback of pre-recorded demonstration steps.
 *
 * Features:
 * - Play/pause/skip controls
 * - Auto-advance after configurable delay
 * - Progress callbacks
 * - Output buffering
 */
export class DemoStepPlayer {
  private step: DemoStepType;
  private status: "idle" | "playing" | "paused" | "completed" = "idle";
  private playbackPosition: number = 0;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  private onProgress: ((progress: DemoProgress) => void) | null = null;
  private outputBuffer: string[] = [];

  constructor(step: DemoStepType) {
    this.step = step;
  }

  /**
   * Start playing the demo step.
   */
  play(): void {
    if (this.status === "completed") {
      return;
    }

    this.status = "playing";
    this.emitProgress();

    // If step has a command and we're at the start, simulate command execution
    if (this.step.command && this.playbackPosition === 0) {
      this.simulateCommandExecution();
    } else if (this.step.autoAdvanceDelay > 0 && this.status === "playing") {
      this.startAutoAdvance();
    }
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this.status !== "playing") return;

    this.status = "paused";
    this.clearAutoAdvanceTimer();
    this.emitProgress();
  }

  /**
   * Resume from paused state.
   */
  resume(): void {
    if (this.status !== "paused") return;

    this.status = "playing";
    if (this.step.autoAdvanceDelay > 0) {
      this.startAutoAdvance();
    }
    this.emitProgress();
  }

  /**
   * Skip to the end/completion of this step.
   */
  skip(): void {
    this.clearAutoAdvanceTimer();
    this.status = "completed";
    this.playbackPosition = 100;
    this.emitProgress();
  }

  /**
   * Reset the player to initial state.
   */
  reset(): void {
    this.clearAutoAdvanceTimer();
    this.status = "idle";
    this.playbackPosition = 0;
    this.outputBuffer = [];
    this.emitProgress();
  }

  /**
   * Set progress callback.
   */
  setProgressCallback(callback: (progress: DemoProgress) => void): void {
    this.onProgress = callback;
  }

  /**
   * Get current status.
   */
  getStatus(): "idle" | "playing" | "paused" | "completed" {
    return this.status;
  }

  /**
   * Get step description.
   */
  getDescription(): string {
    return this.step.description;
  }

  /**
   * Get the command for this step (if any).
   */
  getCommand(): string | undefined {
    return this.step.command;
  }

  /**
   * Get buffered output.
   */
  getOutput(): string {
    return this.outputBuffer.join("");
  }

  /**
   * Check if auto-advance is configured.
   */
  hasAutoAdvance(): boolean {
    return this.step.autoAdvanceDelay > 0;
  }

  /**
   * Get auto-advance delay in ms.
   */
  getAutoAdvanceDelay(): number {
    return this.step.autoAdvanceDelay;
  }

  /**
   * Check if step requires acknowledgment.
   */
  requiresAck(): boolean {
    return this.step.requiresAck;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private simulateCommandExecution(): void {
    // Simulate typing the command character by character
    if (!this.step.command) return;

    this.outputBuffer.push(`> ${this.step.command}\n`);

    // Simulate output appearing after a delay
    setTimeout(() => {
      if (this.step.expectedOutput) {
        this.outputBuffer.push(this.step.expectedOutput + "\n");
      } else {
        this.outputBuffer.push("OK\n");
      }
      this.playbackPosition = 100;
      this.emitProgress();

      // Handle auto-advance
      if (this.status === "playing" && this.step.autoAdvanceDelay > 0) {
        this.startAutoAdvance();
      } else if (this.status === "playing" && !this.step.requiresAck) {
        // Auto-complete if no ack required and no auto-advance delay
        this.status = "completed";
        this.emitProgress();
      }
    }, 500);
  }

  private startAutoAdvance(): void {
    this.clearAutoAdvanceTimer();
    this.autoAdvanceTimer = setTimeout(() => {
      if (this.status === "playing") {
        this.status = "completed";
        this.playbackPosition = 100;
        this.emitProgress();
      }
    }, this.step.autoAdvanceDelay);
  }

  private clearAutoAdvanceTimer(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  private emitProgress(): void {
    if (this.onProgress) {
      this.onProgress({
        stepId: this.step.id,
        status: this.status,
        progress: this.playbackPosition,
        output: this.outputBuffer.join(""),
        canAutoAdvance: this.hasAutoAdvance() && !this.requiresAck(),
      });
    }
  }
}

// ============================================================================
// DemoProgress — Progress Update Payload
// ============================================================================

export interface DemoProgress {
  stepId: string;
  status: "idle" | "playing" | "paused" | "completed";
  progress: number; // 0-100
  output: string;
  canAutoAdvance: boolean;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a DemoStepPlayer from a DemoStep definition.
 */
export function createDemoStepPlayer(step: DemoStepType): DemoStepPlayer {
  return new DemoStepPlayer(step);
}

// ============================================================================
// DemoSequencePlayer — Plays a Sequence of Demo Steps
// ============================================================================

/**
 * DemoSequencePlayer coordinates playback across multiple demo steps.
 */
export class DemoSequencePlayer {
  private players: DemoStepPlayer[] = [];
  private currentIndex: number = 0;
  private onStepChange: ((index: number, player: DemoStepPlayer) => void) | null = null;
  private onSequenceComplete: (() => void) | null = null;

  constructor(steps: DemoStepType[]) {
    this.players = steps.map(step => new DemoStepPlayer(step));
  }

  /**
   * Start playing from the current position.
   */
  play(): void {
    if (this.currentIndex >= this.players.length) {
      return;
    }
    this.getCurrentPlayer().play();
  }

  /**
   * Pause current step.
   */
  pause(): void {
    this.getCurrentPlayer().pause();
  }

  /**
   * Resume current step.
   */
  resume(): void {
    this.getCurrentPlayer().resume();
  }

  /**
   * Skip current step and move to next.
   */
  skip(): void {
    this.advanceToNextStep();
  }

  /**
   * Move to a specific step by index.
   */
  goToStep(index: number): void {
    if (index < 0 || index >= this.players.length) return;

    // Reset current player if playing
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.getStatus() !== "completed") {
      currentPlayer.reset();
    }

    this.currentIndex = index;
    const newPlayer = this.getCurrentPlayer();
    this.emitStepChange();

    if (newPlayer.getStatus() === "idle") {
      newPlayer.play();
    }
  }

  /**
   * Get current step index.
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get total number of steps.
   */
  getTotalSteps(): number {
    return this.players.length;
  }

  /**
   * Get current player.
   */
  getCurrentPlayer(): DemoStepPlayer {
    return this.players[this.currentIndex]!;
  }

  /**
   * Get all players.
   */
  getAllPlayers(): DemoStepPlayer[] {
    return [...this.players];
  }

  /**
   * Reset to beginning.
   */
  reset(): void {
    this.players.forEach(p => p.reset());
    this.currentIndex = 0;
    this.emitStepChange();
  }

  /**
   * Set step change callback.
   */
  setStepChangeCallback(callback: (index: number, player: DemoStepPlayer) => void): void {
    this.onStepChange = callback;
  }

  /**
   * Set sequence complete callback.
   */
  setSequenceCompleteCallback(callback: () => void): void {
    this.onSequenceComplete = callback;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private advanceToNextStep(): void {
    // Mark current as completed if not already
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.getStatus() !== "completed") {
      currentPlayer.skip();
    }

    if (this.currentIndex < this.players.length - 1) {
      this.currentIndex++;
      this.emitStepChange();
      this.getCurrentPlayer().play();
    } else {
      // Sequence complete
      if (this.onSequenceComplete) {
        this.onSequenceComplete();
      }
    }
  }

  private emitStepChange(): void {
    if (this.onStepChange) {
      this.onStepChange(this.currentIndex, this.getCurrentPlayer());
    }
  }
}
