
import * as React from "react"

type ToastVariant = "default" | "destructive" | "success" | "info" | "warning";

type Toast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
};

type ToasterToast = Toast & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  // Fix: Add optional duration property to allow custom toast duration.
  duration?: number;
};

const TOAST_LIMIT = 5;
const TOAST_DURATION = 5000;

type ActionType =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "DISMISS_TOAST"; toastId?: ToasterToast["id"] }
  | { type: "REMOVE_TOAST"; toastId?: ToasterToast["id"] };

interface State {
  toasts: ToasterToast[];
}

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: ActionType) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

const reducer = (state: State, action: ActionType): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

type ToastProps = Omit<ToasterToast, "id">;

function toast(props: ToastProps) {
  const id = crypto.randomUUID();

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
    },
  });

  // Fix: Use the provided duration or fall back to the default.
  setTimeout(() => {
    dismiss();
  }, props.duration || TOAST_DURATION);

  return {
    id: id,
    dismiss,
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };