import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDismissableOverlay } from "./useDismissableOverlay";

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}

describe("useDismissableOverlay", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("locks body scroll while open", () => {
    renderHook(() => useDismissableOverlay({ open: true, onClose: vi.fn() }));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("does not lock body scroll while closed", () => {
    renderHook(() => useDismissableOverlay({ open: false, onClose: vi.fn() }));
    expect(document.body.style.overflow).toBe("");
  });

  it("calls onClose when Escape is pressed while open", () => {
    const onClose = vi.fn();
    renderHook(() => useDismissableOverlay({ open: true, onClose }));
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on Escape while closed", () => {
    const onClose = vi.fn();
    renderHook(() => useDismissableOverlay({ open: false, onClose }));
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("unlocks scroll and stops listening for Escape on unmount", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useDismissableOverlay({ open: true, onClose }));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("");
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("unlocks scroll when toggled from open to closed without unmounting", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ open }) => useDismissableOverlay({ open, onClose }), {
      initialProps: { open: true },
    });
    expect(document.body.style.overflow).toBe("hidden");

    rerender({ open: false });
    expect(document.body.style.overflow).toBe("");
  });

  it("respects lockScroll: false", () => {
    renderHook(() => useDismissableOverlay({ open: true, onClose: vi.fn(), lockScroll: false }));
    expect(document.body.style.overflow).toBe("");
  });

  it("always calls the latest onClose even if the callback identity changes between renders", () => {
    const firstOnClose = vi.fn();
    const secondOnClose = vi.fn();
    const { rerender } = renderHook(({ onClose }) => useDismissableOverlay({ open: true, onClose }), {
      initialProps: { onClose: firstOnClose },
    });

    rerender({ onClose: secondOnClose });
    pressEscape();

    expect(firstOnClose).not.toHaveBeenCalled();
    expect(secondOnClose).toHaveBeenCalledTimes(1);
  });
});
