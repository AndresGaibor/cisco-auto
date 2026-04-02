/**
 * iOS Session Manager - Manages iOS CLI sessions
 * Handles session lifecycle, state tracking, and persistence
 */

import type { CliSession } from "@cisco-auto/ios-domain";

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
  startTime: number;
  lastActivity: number;
  mode: string;
  paging: boolean;
  commands: number;
}

export interface SessionState {
  mode: 'user-exec' | 'privileged-exec' | 'config' | 'config-if' | 'config-line' | 'unknown';
  paging: boolean;
  authenticated: boolean;
  configMode: boolean;
}

export class IOSSessionManager {
  private sessions = new Map<string, SessionInfo>();
  private sessionStates = new Map<string, SessionState>();
  private readonly sessionTimeout = 900000; // 15 minutes

  createSession(sessionId: string, deviceId: string): SessionInfo {
    const session: SessionInfo = {
      sessionId,
      deviceId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      mode: 'user-exec',
      paging: false,
      commands: 0,
    };

    this.sessions.set(sessionId, session);
    this.sessionStates.set(sessionId, {
      mode: 'user-exec',
      paging: false,
      authenticated: false,
      configMode: false,
    });

    return session;
  }

  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionState(sessionId: string): SessionState | undefined {
    return this.sessionStates.get(sessionId);
  }

  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.commands++;
    }
  }

  updateSessionMode(sessionId: string, mode: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.mode = mode;
    }

    const state = this.sessionStates.get(sessionId);
    if (state) {
      state.mode = mode as any;
      state.configMode = mode.startsWith('config');
    }
  }

  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);
    this.sessionStates.delete(sessionId);

    return true;
  }

  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Check if session has expired
    const elapsed = Date.now() - session.lastActivity;
    if (elapsed > this.sessionTimeout) {
      this.closeSession(sessionId);
      return false;
    }

    return true;
  }

  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  getDeviceSessions(deviceId: string): SessionInfo[] {
    return Array.from(this.sessions.values()).filter(s => s.deviceId === deviceId);
  }

  clearExpiredSessions(): number {
    let cleared = 0;
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      const elapsed = now - session.lastActivity;
      if (elapsed > this.sessionTimeout) {
        this.closeSession(sessionId);
        cleared++;
      }
    }

    return cleared;
  }

  getSessionStats(): {
    totalSessions: number;
    activeDevices: number;
    totalCommands: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const devices = new Set(sessions.map(s => s.deviceId));

    return {
      totalSessions: sessions.length,
      activeDevices: devices.size,
      totalCommands: sessions.reduce((sum, s) => sum + s.commands, 0),
    };
  }
}
