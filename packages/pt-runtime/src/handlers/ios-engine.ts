/**
 * @deprecated IosSessionEngine — NOT included in runtime.js build (removed from runtime-manifest.ts)
 *
 * Reason: This class duplicates responsibilities already covered by:
 *   - `pt/terminal/terminal-engine.ts`  → single authority for PT event handling & session state
 *   - `pt/kernel/job-executor.ts`       → single authority for job phase tracking & step execution
 *
 * IosSessionEngine attached its own listeners to PT TerminalLine events (outputWritten, commandEnded,
 * modeChanged, promptChanged), creating two independent event handlers for the same terminal.
 * That was the "blurry boundary" the architecture review identified.
 *
 * This file is kept for reference and unit tests. Do NOT re-add to runtime-manifest.ts.
 * If you need phase-level job tracking in the runtime, use the DeferredJobPlan / KernelJobState
 * contracts defined in `runtime/contracts.ts`.
 */

import type {
  PTCommandLine,
  PTOutputWrittenArgs,
  PTCommandEndedArgs,
  PTModeChangedArgs,
  PTPromptChangedArgs,
} from "../pt-api/pt-api-registry";
import type { PtDeferredDeps } from "../pt-api/pt-deps";

export type IosJobPhase =
  | "queued"
  | "starting"
  | "ensure-privileged"
  | "ensure-config"
  | "run-exec"
  | "run-config"
  | "exit-config"
  | "save-config"
  | "dismiss-initial-dialog"
  | "dismiss-continue-dialog"
  | "dismiss-autoinstall-dialog"
  | "done"
  | "error";

export interface IosJob {
  ticket: string;
  device: string;
  type: "configIos" | "execIos" | "execInteractive";
  payload: Record<string, unknown>;
  steps: string[];
  currentStep: number;
  phase: IosJobPhase;
  state: IosJobPhase;
  output: string;
  createdAt: number;
  updatedAt: number;
  done: boolean;
  error: string | null;
  errorCode: string | null;
  result: unknown;
  session: unknown;
}

export interface IosJobResult {
  ok: boolean;
  raw: string;
  executed?: number;
  results?: Array<{ command: string; raw: string; status: number }>;
  error?: string;
  code?: string;
}

interface ListenerSet {
  outputWritten?: (src: unknown, args: PTOutputWrittenArgs) => void;
  commandEnded?: (src: unknown, args: PTCommandEndedArgs) => void;
  modeChanged?: (src: unknown, args: PTModeChangedArgs) => void;
  promptChanged?: (src: unknown, args: PTPromptChangedArgs) => void;
}

interface JobRecord {
  job: IosJob;
  listeners: ListenerSet | null;
  terminal: PTCommandLine | null;
}

export class IosSessionEngine {
  private jobs: Record<string, JobRecord> = {};
  private seq = 0;

  constructor(private readonly deps: PtDeferredDeps) {}

  createJob(type: IosJob["type"], payload: Record<string, unknown>): string {
    const ticket = `ios_${this.deps.now()}_${++this.seq}`;
    const steps = this.extractSteps(payload);
    this.jobs[ticket] = {
      job: {
        ticket,
        device: String(payload.device || ""),
        type,
        payload,
        steps,
        currentStep: 0,
        phase: "queued",
        state: "queued",
        output: "",
        createdAt: this.deps.now(),
        updatedAt: this.deps.now(),
        done: false,
        error: null,
        errorCode: null,
        result: null,
        session: null,
      },
      listeners: null,
      terminal: null,
    };
    return ticket;
  }

  startJob(ticket: string): void {
    const record = this.jobs[ticket];
    if (!record) return;
    record.job.phase = "starting";
    record.job.state = "starting";
    record.job.updatedAt = this.deps.now();
  }

  issuePhase(ticket: string): void {
    const record = this.jobs[ticket];
    if (!record || record.job.done) return;

    if (record.job.phase === "queued") {
      this.startJob(ticket);
      return;
    }

    if (record.job.phase === "starting") {
      record.job.phase = record.job.type === "configIos" ? "ensure-config" : "run-exec";
      record.job.state = record.job.phase;
      record.job.updatedAt = this.deps.now();
      return;
    }

    if (record.job.currentStep >= record.job.steps.length) {
      this.completeJob(ticket);
    }
  }

  pollJob(ticket: string): IosJobResult | null {
    const record = this.jobs[ticket];
    if (!record) return null;

    return {
      ok: !record.job.error,
      raw: record.job.output,
      executed: record.job.currentStep,
      results: record.job.steps.map((command) => ({
        command,
        raw: record.job.output,
        status: record.job.error ? 1 : 0,
      })),
      error: record.job.error || undefined,
      code: record.job.errorCode || undefined,
    };
  }

  getJob(ticket: string): IosJob | null {
    return this.jobs[ticket]?.job ?? null;
  }

  getActiveJobs(): IosJob[] {
    const jobs: IosJob[] = [];
    for (const key in this.jobs) {
      const job = this.jobs[key]?.job;
      if (job && !job.done) jobs.push(job);
    }
    return jobs;
  }

  onOutputWritten(deviceName: string, args: PTOutputWrittenArgs): void {
    this.forDevice(deviceName, (record) => {
      record.job.output += args.newOutput || "";
      record.job.updatedAt = this.deps.now();
      record.job.state = "run-exec";
    });
  }

  onCommandEnded(deviceName: string, args: PTCommandEndedArgs): void {
    this.forDevice(deviceName, (record) => {
      if (args.status !== 0) {
        record.job.error = `Command failed with status ${args.status}`;
        record.job.errorCode = "COMMAND_FAILED";
        this.failJob(record.job.ticket, record.job.error, record.job.errorCode);
        return;
      }
      record.job.currentStep += 1;
      record.job.updatedAt = this.deps.now();
      if (record.job.currentStep >= record.job.steps.length) {
        this.completeJob(record.job.ticket);
      }
    });
  }

  onModeChanged(deviceName: string, args: PTModeChangedArgs): void {
    this.forDevice(deviceName, (record) => {
      record.job.state = this.mapMode(args.newMode);
      record.job.updatedAt = this.deps.now();
    });
  }

  onPromptChanged(deviceName: string, args: PTPromptChangedArgs): void {
    this.forDevice(deviceName, (record) => {
      const state = this.deps.querySessionState(deviceName);
      record.job.session = state;
      record.job.updatedAt = this.deps.now();
    });
  }

  attachListeners(deviceName: string, term: PTCommandLine): void {
    this.detachListeners(deviceName);

    const listeners: ListenerSet = {
      outputWritten: (_src, args) => this.onOutputWritten(deviceName, args),
      commandEnded: (_src, args) => this.onCommandEnded(deviceName, args),
      modeChanged: (_src, args) => this.onModeChanged(deviceName, args),
      promptChanged: (_src, args) => this.onPromptChanged(deviceName, args),
    };

    term.registerEvent("outputWritten", null, listeners.outputWritten!);
    term.registerEvent("commandEnded", null, listeners.commandEnded!);
    term.registerEvent("modeChanged", null, listeners.modeChanged!);
    term.registerEvent("promptChanged", null, listeners.promptChanged!);

    const record = this.getOrCreateRecordByDevice(deviceName);
    record.listeners = listeners;
    record.terminal = term;
  }

  detachListeners(deviceName: string): void {
    const record = this.findByDevice(deviceName);
    if (!record || !record.listeners || !record.terminal) return;

    const listeners = record.listeners;
    const term = record.terminal;

    if (listeners.outputWritten)
      term.unregisterEvent("outputWritten", null, listeners.outputWritten);
    if (listeners.commandEnded) term.unregisterEvent("commandEnded", null, listeners.commandEnded);
    if (listeners.modeChanged) term.unregisterEvent("modeChanged", null, listeners.modeChanged);
    if (listeners.promptChanged)
      term.unregisterEvent("promptChanged", null, listeners.promptChanged);

    record.listeners = null;
    record.terminal = null;
  }

  checkTimeouts(): void {
    for (const ticket in this.jobs) {
      const record = this.jobs[ticket];
      if (!record || record.job.done) continue;
      if (this.deps.now() - record.job.updatedAt > 300000) {
        this.failJob(ticket, "IOS job timed out", "COMMAND_TIMEOUT");
      }
    }
  }

  private extractSteps(payload: Record<string, unknown>): string[] {
    const commands = payload.commands;
    if (Array.isArray(commands)) return commands.map((command) => String(command));
    const steps = payload.steps;
    if (Array.isArray(steps)) return steps.map((step) => String(step));
    return [];
  }

  private failJob(ticket: string, message: string, code: string): void {
    const record = this.jobs[ticket];
    if (!record) return;
    record.job.error = message;
    record.job.errorCode = code;
    record.job.done = true;
    record.job.phase = "error";
    record.job.state = "error";
    record.job.updatedAt = this.deps.now();
  }

  private completeJob(ticket: string): void {
    const record = this.jobs[ticket];
    if (!record) return;
    record.job.done = true;
    record.job.phase = "done";
    record.job.state = "done";
    record.job.updatedAt = this.deps.now();
  }

  private normalizeTerminalSession(job: IosJob): boolean {
    return !!job.device;
  }

  private classifyTerminalState(
    prompt: string,
    mode: string,
    input: string,
    output: string,
  ): string {
    if (output.includes("--More--")) return "dismiss-continue-dialog";
    if (/\[confirm\]/i.test(output)) return "dismiss-continue-dialog";
    if (/password:/i.test(output)) return "dismiss-autoinstall-dialog";
    if (mode.indexOf("config") === 0) return "run-config";
    if (mode === "privileged-exec") return "run-exec";
    return "starting";
  }

  private mapMode(mode: string): IosJobPhase {
    if (mode.indexOf("config") === 0) return "run-config";
    if (mode === "privileged-exec") return "run-exec";
    if (mode === "user-exec") return "starting";
    return "starting";
  }

  private findByDevice(deviceName: string): JobRecord | null {
    for (const ticket in this.jobs) {
      const record = this.jobs[ticket];
      if (record && record.job.device === deviceName) return record;
    }
    return null;
  }

  private forDevice(deviceName: string, fn: (record: JobRecord) => void): void {
    const record = this.findByDevice(deviceName);
    if (record) fn(record);
  }

  private getOrCreateRecordByDevice(deviceName: string): JobRecord {
    const existing = this.findByDevice(deviceName);
    if (existing) return existing;

    const ticket = this.createJob("execInteractive", { device: deviceName });
    return this.jobs[ticket];
  }
}

export function createIosSessionEngine(deps: PtDeferredDeps): IosSessionEngine {
  return new IosSessionEngine(deps);
}
