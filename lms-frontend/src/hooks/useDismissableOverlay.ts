import { useEffect, useRef } from "react";

interface UseDismissableOverlayOptions {
  /** Whether the overlay is currently open. Effects (Escape listener, scroll lock) only run while true. */
  open: boolean;
  onClose: () => void;
  /** Lock body scroll while open. Defaults to true. */
  lockScroll?: boolean;
}

/**
 * The behavior every dismissable overlay needs regardless of what else it does: Escape closes
 * it, and body scroll is locked while it's open. Shared by Modal and the mobile nav drawer so
 * neither can forget one half of the pair. Does not touch focus - Modal layers its own focus
 * trap (initial focus, Tab cycling, restore-on-close) on top where that's needed; the drawer
 * doesn't need a full trap, just this.
 */
export function useDismissableOverlay({ open, onClose, lockScroll = true }: UseDismissableOverlayOptions): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    if (lockScroll) {
      document.body.style.overflow = "hidden";
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      if (lockScroll) {
        document.body.style.overflow = "";
      }
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, lockScroll]);
}
