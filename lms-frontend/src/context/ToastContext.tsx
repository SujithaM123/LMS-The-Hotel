import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { IconCheck, IconAlert, IconX } from "../components/icons";

type ToastKind = "info" | "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* aria-live lives on this container alone - it's present from first render, so every
          screen reader picks it up before any toast is ever inserted into it. A role="status"
          on each toast too would be a second, overlapping live-region mechanism for the same
          text and risks a double announcement in some assistive tech. */}
      <div className="toast-region" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span className="toast-icon" style={{ color: t.kind === "error" ? "var(--danger)" : t.kind === "success" ? "var(--success)" : "var(--accent-text)" }}>
              {t.kind === "error" ? <IconAlert size={18} /> : <IconCheck size={18} />}
            </span>
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
