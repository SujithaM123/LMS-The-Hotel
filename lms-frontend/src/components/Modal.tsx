import { useEffect, useRef, type ReactNode } from "react";
import { useDismissableOverlay } from "../hooks/useDismissableOverlay";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;
  const triggerRef = useRef<Element | null>(null);

  // Escape-to-close and body scroll lock are shared with every other overlay; a Modal is always
  // mounted-while-open (the parent conditionally renders it), so `open` is simply always true.
  useDismissableOverlay({ open: true, onClose });

  // Focus trap is Modal-specific (the drawer doesn't need it), so it stays here rather than
  // moving into the shared hook: initial focus, Tab/Shift+Tab cycling, and focus restoration.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    const modal = modalRef.current;
    const focusables = modal?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !modal) return;
      const items = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
