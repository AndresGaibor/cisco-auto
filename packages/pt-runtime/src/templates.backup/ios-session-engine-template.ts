/**
 * IOS Session Engine Template (Fase 6)
 * 
 * Explicit state machine for IOS terminal interactions.
 * Replaces procedural polling with event-driven state transitions.
 * 
 * Generated into: pt-runtime/src/templates/ios-session-engine-template.ts
 */

import { IosMode, SessionInfo } from '@cisco-auto/types';

/**
 * Events that drive the state machine
 */
export type TerminalEvent =
  | { type: 'commandStarted'; command: string }
  | { type: 'outputWritten'; data: string }
  | { type: 'moreDisplayed' }
  | { type: 'confirmPrompt'; prompt: string }
  | { type: 'passwordPrompt'; prompt: string }
  | { type: 'destinationFilenamePrompt'; prompt: string }
  | { type: 'promptChanged'; prompt: string; mode: IosMode }
  | { type: 'modeChanged'; newMode: IosMode }
  | { type: 'commandEnded'; exitCode?: number }
  | { type: 'timeout' }
  | { type: 'desync' };

/**
 * IOS Terminal Session State Machine
 * 
 * States:
 *  - idle: waiting for command
 *  - awaiting-output: command sent, awaiting response
 *  - paging: output contains paging prompt
 *  - awaiting-confirm: terminal prompts for confirm ([y/n]?, [yes/no]?)
 *  - awaiting-password: terminal prompts for password
 *  - awaiting-destination-filename: copy/backup destination prompt
 *  - awaiting-command-end: output arrived, waiting for real command termination
 *  - desynced: lost sync with device
 *  - completed: command execution finished
 *  - failed: error occurred
 */
export class IosSessionEngine {
  private mode: IosMode = 'user-exec';
  private paging = false;
  private awaitingConfirm = false;
  private awaitingPassword = false;
  private awaitingDestinationFilename = false;
  private awaitingDnsLookup = false;
  private prompt = '>';
  private deviceName = 'unknown';
  
  private currentCommand = '';
  private outputBuffer = '';
  private state: 'idle' | 'awaiting-output' | 'paging' | 'awaiting-confirm' | 
                 'awaiting-password' | 'awaiting-destination-filename' | 
                 'awaiting-command-end' | 'desynced' | 'completed' | 'failed' = 'idle';
  
  private eventLog: Array<{
    timestamp: number;
    type: string;
    data?: unknown;
  }> = [];
  
  private metricsInteraction = {
    pagesAdvanced: 0,
    confirmsAnswered: 0,
    passwordsRequested: 0,
    destinationFilenameAnswered: 0,
    modesChanged: 0,
  };

  constructor(initialMode: IosMode = 'user-exec', initialPrompt = '>') {
    this.mode = initialMode;
    this.prompt = initialPrompt;
    this.updatePromptFromMode();
  }

  /**
   * Process an event and update the state machine
   */
  processEvent(event: TerminalEvent): void {
    this.eventLog.push({
      timestamp: Date.now(),
      type: event.type,
      data: event,
    });

    switch (event.type) {
      case 'commandStarted':
        this.handleCommandStarted(event.command);
        break;
      case 'outputWritten':
        this.handleOutputWritten(event.data);
        break;
      case 'moreDisplayed':
        this.handleMoreDisplayed();
        break;
      case 'confirmPrompt':
        this.handleConfirmPrompt(event.prompt);
        break;
      case 'passwordPrompt':
        this.handlePasswordPrompt(event.prompt);
        break;
      case 'destinationFilenamePrompt':
        this.handleDestinationFilenamePrompt(event.prompt);
        break;
      case 'promptChanged':
        this.handlePromptChanged(event.prompt, event.mode);
        break;
      case 'modeChanged':
        this.handleModeChanged(event.newMode);
        break;
      case 'commandEnded':
        this.handleCommandEnded(event.exitCode);
        break;
      case 'timeout':
        this.handleTimeout();
        break;
      case 'desync':
        this.handleDesync();
        break;
    }
  }

  /**
   * Get current session state
   */
  getState(): SessionInfo {
    return {
      mode: this.mode,
      paging: this.paging,
      awaitingConfirm: this.awaitingConfirm,
      awaitingPassword: this.awaitingPassword,
      awaitingDestinationFilename: this.awaitingDestinationFilename,
      awaitingDnsLookup: this.awaitingDnsLookup,
      prompt: this.prompt,
      deviceName: this.deviceName,
    };
  }

  /**
   * Get interaction metrics
   */
  getMetrics() {
    return { ...this.metricsInteraction };
  }

  /**
   * Get execution state
   */
  getExecutionState() {
    return this.state;
  }

  /**
   * Get accumulated output
   */
  getOutput(): string {
    return this.outputBuffer;
  }

  /**
   * Get event log
   */
  getEventLog() {
    return [...this.eventLog];
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private handleCommandStarted(command: string): void {
    this.currentCommand = command;
    this.outputBuffer = '';
    this.state = 'awaiting-output';
  }

  private handleOutputWritten(data: string): void {
    this.outputBuffer += data;

    // Detect paging
    if (this.detectPaging(data)) {
      this.paging = true;
      this.state = 'paging';
      return;
    }

    // Detect confirm prompt
    if (this.detectConfirmPrompt(data)) {
      this.awaitingConfirm = true;
      this.state = 'awaiting-confirm';
      return;
    }

    // Detect password prompt
    if (this.detectPasswordPrompt(data)) {
      this.awaitingPassword = true;
      this.metricsInteraction.passwordsRequested++;
      this.state = 'awaiting-password';
      return;
    }

    // Detect destination filename prompt
    if (this.detectDestinationFilenamePrompt(data)) {
      this.awaitingDestinationFilename = true;
      this.state = 'awaiting-destination-filename';
      return;
    }

    // Update mode if prompt changed
    if (this.detectModeChange(data)) {
      this.updateModeFromOutput(data);
    }

    // Keep accumulating output
    this.state = 'awaiting-command-end';
  }

  private handleMoreDisplayed(): void {
    this.paging = true;
    this.metricsInteraction.pagesAdvanced++;
    this.state = 'paging';
  }

  private handleConfirmPrompt(prompt: string): void {
    this.awaitingConfirm = true;
    this.state = 'awaiting-confirm';
  }

  private handlePasswordPrompt(prompt: string): void {
    this.awaitingPassword = true;
    this.metricsInteraction.passwordsRequested++;
    this.state = 'awaiting-password';
  }

  private handleDestinationFilenamePrompt(prompt: string): void {
    this.awaitingDestinationFilename = true;
    this.state = 'awaiting-destination-filename';
  }

  private handlePromptChanged(prompt: string, mode: IosMode): void {
    this.prompt = prompt;
    this.mode = mode;
    this.updatePromptFromMode();
    
    // Clear interactive flags when returning to normal prompt
    if (!this.isInteractivePrompt(prompt)) {
      this.awaitingConfirm = false;
      this.awaitingPassword = false;
      this.awaitingDestinationFilename = false;
      this.paging = false;
    }
  }

  private handleModeChanged(newMode: IosMode): void {
    if (newMode !== this.mode) {
      this.mode = newMode;
      this.metricsInteraction.modesChanged++;
      this.updatePromptFromMode();
    }
  }

  private handleCommandEnded(exitCode?: number): void {
    // Clear all interactive flags
    this.awaitingConfirm = false;
    this.awaitingPassword = false;
    this.awaitingDestinationFilename = false;
    this.paging = false;

    // Determine final state
    if (exitCode === 0 || exitCode === undefined) {
      this.state = 'completed';
    } else {
      this.state = 'failed';
    }
  }

  private handleTimeout(): void {
    if (this.awaitingConfirm) {
      this.state = 'failed';
    } else if (this.awaitingPassword) {
      this.state = 'failed';
    } else if (this.awaitingDestinationFilename) {
      this.state = 'failed';
    } else if (this.paging) {
      this.state = 'failed';
    } else {
      this.state = 'failed';
    }
  }

  private handleDesync(): void {
    this.state = 'desynced';
  }

  // =========================================================================
  // Detection Helpers
  // =========================================================================

  private detectPaging(data: string): boolean {
    // Cisco paging: "--More--", "   [OK]", etc.
    return /--More--/.test(data) || /\s+\[OK\]/.test(data);
  }

  private detectConfirmPrompt(data: string): boolean {
    // Confirm: [y/n]?, [yes/no]?, Proceed?, etc.
    return /\[y\/n\]\?/.test(data) ||
           /\[yes\/no\]\?/.test(data) ||
           /Proceed\?/i.test(data) ||
           /Overwrite\?/i.test(data);
  }

  private detectPasswordPrompt(data: string): boolean {
    // Password prompts (case-insensitive, no echo)
    return /Password:/.test(data) ||
           /password:/i.test(data) ||
           /Enter.*password/i.test(data);
  }

  private detectDestinationFilenamePrompt(data: string): boolean {
    // Destination filename (for copy/backup commands)
    return /Destination filename/i.test(data) ||
           /Destination\/exit/i.test(data);
  }

  private detectModeChange(data: string): boolean {
    // Look for mode indicators in output
    return /#/.test(data) || />/.test(data) || /\(config.*\)#/.test(data);
  }

  private isInteractivePrompt(prompt: string): boolean {
    return /\?$/.test(prompt) || /Password:/.test(prompt);
  }

  // =========================================================================
  // Mode Management
  // =========================================================================

  private updatePromptFromMode(): void {
    switch (this.mode) {
      case 'user-exec':
        this.prompt = '>';
        break;
      case 'priv-exec':
        this.prompt = '#';
        break;
      case 'config':
      case 'config-if':
      case 'config-line':
      case 'config-router':
      case 'config-vlan':
        this.prompt = '(config)#';
        break;
      default:
        this.prompt = '#';
    }
  }

  private updateModeFromOutput(data: string): void {
    if (/\(config.*\)#/.test(data)) {
      this.mode = 'config';
      this.metricsInteraction.modesChanged++;
    } else if (/#/.test(data) && !/\(/.test(data)) {
      this.mode = 'priv-exec';
      this.metricsInteraction.modesChanged++;
    } else if (/>/.test(data)) {
      this.mode = 'user-exec';
      this.metricsInteraction.modesChanged++;
    }
  }

  /**
   * Advance paging (user sends space/return to continue)
   */
  advancePaging(): void {
    if (this.paging) {
      this.metricsInteraction.pagesAdvanced++;
      this.paging = false;
      this.state = 'awaiting-output';
    }
  }

  /**
   * Answer confirmation prompt
   */
  answerConfirm(answer: 'y' | 'n' | 'yes' | 'no'): void {
    if (this.awaitingConfirm) {
      this.metricsInteraction.confirmsAnswered++;
      this.awaitingConfirm = false;
      this.state = 'awaiting-output';
    }
  }

  /**
   * Provide password
   */
  providePassword(password: string): void {
    if (this.awaitingPassword) {
      this.awaitingPassword = false;
      this.state = 'awaiting-output';
    }
  }

  /**
   * Provide destination filename
   */
  provideDestinationFilename(filename: string): void {
    if (this.awaitingDestinationFilename) {
      this.metricsInteraction.destinationFilenameAnswered++;
      this.awaitingDestinationFilename = false;
      this.state = 'awaiting-output';
    }
  }

  /**
   * Check if any interactive prompt is pending
   */
  hasInteractivePending(): boolean {
    return this.awaitingConfirm ||
           this.awaitingPassword ||
           this.awaitingDestinationFilename ||
           this.paging;
  }

  /**
   * Check if execution is complete
   */
  isComplete(): boolean {
    return this.state === 'completed' || this.state === 'failed';
  }

  /**
   * Check if session is desynced
   */
  isDesynced(): boolean {
    return this.state === 'desynced';
  }

  /**
   * Reset engine for new command
   */
  reset(): void {
    this.currentCommand = '';
    this.outputBuffer = '';
    this.state = 'idle';
    this.paging = false;
    this.awaitingConfirm = false;
    this.awaitingPassword = false;
    this.awaitingDestinationFilename = false;
  }
}
