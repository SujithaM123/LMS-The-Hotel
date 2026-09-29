import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

function renderModal(onClose = vi.fn()) {
  const trigger = document.createElement("button");
  trigger.textContent = "Open";
  document.body.appendChild(trigger);
  trigger.focus();

  const view = render(
    <Modal title="Test modal" onClose={onClose}>
      <button>First</button>
      <button>Second</button>
    </Modal>,
  );

  return { trigger, onClose, ...view };
}

describe("Modal", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
    document.body.innerHTML = "";
  });

  it("opens and renders its content with dialog semantics", () => {
    renderModal();
    const dialog = screen.getByRole("dialog", { name: "Test modal" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("focuses the first focusable element on open", async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole("button", { name: "First" })).toHaveFocus());
  });

  it("locks body scroll while open", () => {
    renderModal();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    renderModal(onClose);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab focus: cycles from the last item back to the first", async () => {
    renderModal();
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    await waitFor(() => expect(first).toHaveFocus());

    second.focus();
    await userEvent.tab();

    expect(first).toHaveFocus();
  });

  it("traps Shift+Tab: cycles from the first item back to the last", async () => {
    renderModal();
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    await waitFor(() => expect(first).toHaveFocus());

    await userEvent.tab({ shift: true });

    expect(second).toHaveFocus();
  });

  it("restores focus to the trigger element on unmount", async () => {
    const { trigger, unmount } = renderModal();
    await waitFor(() => expect(screen.getByRole("button", { name: "First" })).toHaveFocus());

    unmount();

    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes when the backdrop is clicked but not when the dialog itself is clicked", async () => {
    const onClose = vi.fn();
    renderModal(onClose);

    await userEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    // The backdrop is the dialog's parent; click it directly.
    const backdrop = screen.getByRole("dialog").parentElement!;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
