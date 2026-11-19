import { Project } from "./types";

export const HISTORY_LIMIT = 100;

export interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
  /** Key of the last coalescing group, so slider drags create one undo step. */
  lastGroup: string | null;
}

export type HistoryAction =
  | { type: "set"; project: Project; group?: string }
  | { type: "replace"; project: Project }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "endGroup" };

export function initHistory(project: Project): HistoryState {
  return { past: [], present: project, future: [], lastGroup: null };
}

/**
 * Undo/redo reducer.
 *  - `set` records an undo step. Consecutive sets sharing the same `group` collapse into one step.
 *  - `replace` swaps the present without touching history (used when restoring/creating projects).
 */
export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "set": {
      if (action.project === state.present) return state;
      const coalesce = action.group != null && action.group === state.lastGroup;
      const past = coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT);
      return { past, present: action.project, future: [], lastGroup: action.group ?? null };
    }
    case "replace":
      return initHistory(action.project);
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        lastGroup: null,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
        lastGroup: null,
      };
    }
    case "endGroup":
      return state.lastGroup === null ? state : { ...state, lastGroup: null };
    default:
      return state;
  }
}
