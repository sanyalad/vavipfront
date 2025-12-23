/**
 * Deck State Machine
 * 
 * Centralizes all deck navigation state to ensure atomic updates
 * and prevent one-frame intermediate states that cause visual artifacts.
 */

// ===== State Types =====
export type DeckMode = 
  | 'idle'
  | 'gesturing_next'
  | 'gesturing_prev'
  | 'animating_next'
  | 'animating_prev'

export interface DeckState {
  mode: DeckMode
  activeIndex: number
  fromIndex: number
  incomingIndex: number | null
  gestureProgress: number
  footerProgress: number
  isFooterOpen: boolean
}

// ===== Action Types =====
export type DeckAction =
  | { type: 'GESTURE_START'; direction: 'next' | 'prev'; activeIndex: number }
  | { type: 'GESTURE_PROGRESS'; progress: number; incomingIndex: number | null }
  | { type: 'GESTURE_COMMIT'; targetIndex: number }
  | { type: 'GESTURE_ROLLBACK' }
  | { type: 'ANIMATION_START'; fromIndex: number; toIndex: number; direction: 'next' | 'prev' }
  | { type: 'ANIMATION_END'; finalIndex: number }
  | { type: 'FOOTER_OPEN' }
  | { type: 'FOOTER_CLOSE' }
  | { type: 'FOOTER_PROGRESS'; progress: number }
  | { type: 'RESET_TO_INDEX'; index: number }
  | { type: 'FORCE_IDLE' }

// ===== Initial State =====
export const createInitialDeckState = (initialIndex: number = 0): DeckState => ({
  mode: 'idle',
  activeIndex: initialIndex,
  fromIndex: initialIndex,
  incomingIndex: null,
  gestureProgress: 0,
  footerProgress: 0,
  isFooterOpen: false,
})

// ===== Reducer =====
export function deckReducer(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'GESTURE_START': {
      // Can only start gesture from idle
      if (state.mode !== 'idle') {
        return state
      }
      const mode: DeckMode = action.direction === 'next' ? 'gesturing_next' : 'gesturing_prev'
      return {
        ...state,
        mode,
        fromIndex: action.activeIndex,
        activeIndex: action.activeIndex,
        incomingIndex: null,
        gestureProgress: 0,
      }
    }

    case 'GESTURE_PROGRESS': {
      // Only update progress if gesturing
      if (state.mode !== 'gesturing_next' && state.mode !== 'gesturing_prev') {
        return state
      }
      return {
        ...state,
        gestureProgress: action.progress,
        incomingIndex: action.incomingIndex,
      }
    }

    case 'GESTURE_COMMIT': {
      // Transition from gesturing to animating (for trackpad this is instant)
      if (state.mode !== 'gesturing_next' && state.mode !== 'gesturing_prev') {
        return state
      }
      const direction = state.mode === 'gesturing_next' ? 'next' : 'prev'
      const animatingMode: DeckMode = direction === 'next' ? 'animating_next' : 'animating_prev'
      return {
        ...state,
        mode: animatingMode,
        activeIndex: action.targetIndex,
        fromIndex: state.activeIndex,
        incomingIndex: action.targetIndex,
        gestureProgress: 0,
      }
    }

    case 'GESTURE_ROLLBACK': {
      // Return to idle from gesture without committing
      if (state.mode !== 'gesturing_next' && state.mode !== 'gesturing_prev') {
        return state
      }
      return {
        ...state,
        mode: 'idle',
        incomingIndex: null,
        gestureProgress: 0,
      }
    }

    case 'ANIMATION_START': {
      // Start CSS keyframe animation (e.g., from mouse wheel)
      const animatingMode: DeckMode = action.direction === 'next' ? 'animating_next' : 'animating_prev'
      return {
        ...state,
        mode: animatingMode,
        fromIndex: action.fromIndex,
        activeIndex: action.toIndex,
        incomingIndex: action.toIndex,
        gestureProgress: 0,
      }
    }

    case 'ANIMATION_END': {
      // Animation completed - return to idle
      if (state.mode !== 'animating_next' && state.mode !== 'animating_prev') {
        return state
      }
      return {
        ...state,
        mode: 'idle',
        activeIndex: action.finalIndex,
        fromIndex: action.finalIndex,
        incomingIndex: null,
        gestureProgress: 0,
      }
    }

    case 'FOOTER_OPEN': {
      return {
        ...state,
        isFooterOpen: true,
        footerProgress: 1,
      }
    }

    case 'FOOTER_CLOSE': {
      return {
        ...state,
        isFooterOpen: false,
        footerProgress: 0,
      }
    }

    case 'FOOTER_PROGRESS': {
      return {
        ...state,
        footerProgress: Math.max(0, Math.min(1, action.progress)),
      }
    }

    case 'RESET_TO_INDEX': {
      return {
        ...state,
        mode: 'idle',
        activeIndex: action.index,
        fromIndex: action.index,
        incomingIndex: null,
        gestureProgress: 0,
      }
    }

    case 'FORCE_IDLE': {
      // Emergency reset - clears everything but keeps current active index
      return {
        ...state,
        mode: 'idle',
        incomingIndex: null,
        gestureProgress: 0,
      }
    }

    default:
      return state
  }
}

// ===== Derived State Helpers =====

export function getDeckDirection(state: DeckState): 'next' | 'prev' | null {
  switch (state.mode) {
    case 'gesturing_next':
    case 'animating_next':
      return 'next'
    case 'gesturing_prev':
    case 'animating_prev':
      return 'prev'
    default:
      return null
  }
}

export function isDeckAnimating(state: DeckState): boolean {
  return state.mode === 'animating_next' || state.mode === 'animating_prev'
}

export function isDeckGesturing(state: DeckState): boolean {
  return state.mode === 'gesturing_next' || state.mode === 'gesturing_prev'
}

export function isDeckBusy(state: DeckState): boolean {
  return state.mode !== 'idle'
}

// Compute which section indices should be visible
export function getVisibleSections(state: DeckState): {
  activeIdx: number
  nextIdx: number | null
  prevIdx: number | null
} {
  const dir = getDeckDirection(state)
  
  if (!dir) {
    return {
      activeIdx: state.activeIndex,
      nextIdx: null,
      prevIdx: null,
    }
  }

  if (dir === 'next') {
    return {
      activeIdx: state.activeIndex,
      nextIdx: state.incomingIndex,
      prevIdx: state.fromIndex !== state.activeIndex ? state.fromIndex : null,
    }
  } else {
    return {
      activeIdx: state.activeIndex,
      prevIdx: state.incomingIndex,
      nextIdx: state.fromIndex !== state.activeIndex ? state.fromIndex : null,
    }
  }
}

