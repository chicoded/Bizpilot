"use client";

import * as React from "react";

const TOAST_LIMIT = 3;
/** Exit animation time after dismiss */
const TOAST_REMOVE_DELAY = 220;
/** Default time on screen before auto-dismiss */
const TOAST_DURATION_MS = 4000;
/** Longer when an action button is shown (e.g. View receipt) */
const TOAST_DURATION_WITH_ACTION_MS = 7000;
/** Errors stay slightly longer */
const TOAST_DURATION_ERROR_MS = 5500;

type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
  action?: ToastAction;
  dismissed?: boolean;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

type ActionType = typeof actionTypes;

type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToastProps }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToastProps> & { id: string } }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: string }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: string };

interface State {
  toasts: ToastProps[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function clearToastTimeout(toastId: string) {
  const existing = toastTimeouts.get(toastId);
  if (existing) {
    clearTimeout(existing);
    toastTimeouts.delete(toastId);
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [{ ...action.toast, dismissed: false }, ...state.toasts].slice(
          0,
          TOAST_LIMIT
        ),
      };
    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;
      if (toastId) {
        clearToastTimeout(toastId);
        addToRemoveQueue(toastId);
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId ? { ...t, dismissed: true } : t
          ),
        };
      }
      state.toasts.forEach((t) => {
        clearToastTimeout(t.id);
        addToRemoveQueue(t.id);
      });
      return {
        ...state,
        toasts: state.toasts.map((t) => ({ ...t, dismissed: true })),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      clearToastTimeout(action.toastId);
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
}

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

function scheduleAutoDismiss(toastId: string, delayMs: number) {
  clearToastTimeout(toastId);
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
  }, delayMs);
  toastTimeouts.set(toastId, timeout);
}

function resolveDuration(
  variant: ToastProps["variant"],
  hasAction: boolean
): number {
  if (hasAction) return TOAST_DURATION_WITH_ACTION_MS;
  if (variant === "destructive") return TOAST_DURATION_ERROR_MS;
  return TOAST_DURATION_MS;
}

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

export function toast({
  title,
  description,
  variant = "default",
  action,
}: Omit<ToastProps, "id" | "dismissed">) {
  const id = genId();
  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: { id, title, description, variant, action },
  });

  scheduleAutoDismiss(id, resolveDuration(variant, Boolean(action)));

  return {
    id,
    dismiss: () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id }),
  };
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}
