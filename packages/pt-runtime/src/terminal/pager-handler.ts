// ============================================================================
// Pager Handler - Maneja --More-- y paginación
// ============================================================================

export interface PagerState {
  active: boolean;
  advances: number;
  maxAdvances: number;
}

export function createPagerState(maxAdvances: number = 50): PagerState {
  return {
    active: false,
    advances: 0,
    maxAdvances,
  };
}

export function detectPager(output: string): boolean {
  if (!output) return false;

  const text = String(output)
    .replace(/\r/g, "")
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");

  return /--More--\s*$/i.test(text) || /--More--/i.test(text);
}

export function shouldAdvance(state: PagerState): boolean {
  return state.active && state.advances < state.maxAdvances;
}

export function advance(state: PagerState): PagerState {
  return {
    ...state,
    advances: state.advances + 1,
  };
}

export function activate(state: PagerState): PagerState {
  return { ...state, active: true };
}

export function deactivate(state: PagerState): PagerState {
  return { ...state, active: false };
}

export function detectLoop(state: PagerState): boolean {
  return state.advances >= state.maxAdvances;
}

export const DEFAULT_PAGER_MAX = 50;

export const PAGER_ERROR = "TERMINAL_PAGER_LOOP_DETECTED";

export interface PagerHandlerConfig {
  maxAdvances?: number;
  enabled?: boolean;
}

export function createPagerHandler(config: PagerHandlerConfig = {}): {
  state: PagerState;
  advance: () => void;
  handleOutput: (output: string) => boolean;
  isLoop: () => boolean;
  canContinue: () => boolean;
  reset: () => void;
} {
  const maxDefaults = config.maxAdvances ?? DEFAULT_PAGER_MAX;
  let pagerState = createPagerState(maxDefaults);
  let lastOutput = "";

  return {
    get state() {
      return pagerState;
    },
    advance() {
      pagerState = advance(pagerState);
    },
    handleOutput(output: string): boolean {
      lastOutput = output;
      if (detectPager(output)) {
        pagerState = activate(pagerState);
        return true;
      } else if (pagerState.active && !detectPager(output)) {
        pagerState = deactivate(pagerState);
        return false;
      }
      return false;
    },
    isLoop(): boolean {
      return detectLoop(pagerState);
    },
    canContinue(): boolean {
      return config.enabled !== false && shouldAdvance(pagerState);
    },
    reset() {
      pagerState = createPagerState(maxDefaults);
      lastOutput = "";
    },
  };
}