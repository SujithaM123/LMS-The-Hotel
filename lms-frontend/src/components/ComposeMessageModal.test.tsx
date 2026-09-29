import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ComposeMessageModal } from "./ComposeMessageModal";

vi.mock("../api/client", () => ({
  api: { sendMessage: vi.fn() },
  ApiError: class ApiError extends Error {},
  friendlyMessage: () => "error",
}));

describe("ComposeMessageModal", () => {
  it("focuses the message textarea on open via Modal's generic focus handling, with no native autoFocus", async () => {
    render(
      <ComposeMessageModal
        courseId={1}
        studentId={2}
        studentName="Aditya Kumar"
        onClose={vi.fn()}
        onSent={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText("Message");
    expect(textarea).not.toHaveAttribute("autofocus");
    await waitFor(() => expect(textarea).toHaveFocus());
  });

  it("renders the recipient's name in the modal title", () => {
    render(
      <ComposeMessageModal
        courseId={1}
        studentId={2}
        studentName="Aditya Kumar"
        onClose={vi.fn()}
        onSent={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Message Aditya Kumar" })).toBeInTheDocument();
  });
});
