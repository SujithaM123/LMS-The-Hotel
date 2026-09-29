import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./ToastContext";

function Trigger({ message }: { message: string }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast(message)}>Show</button>;
}

describe("ToastContext", () => {
  it("shows a toast and exposes it inside a single aria-live region", async () => {
    render(
      <ToastProvider>
        <Trigger message="Enrolled! Find it under My Courses." />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(screen.getByText("Enrolled! Find it under My Courses.")).toBeInTheDocument();
  });

  it("has exactly one aria-live region for toasts, so a screen reader announces new text once", async () => {
    render(
      <ToastProvider>
        <Trigger message="Hello" />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    const liveRegions = document.querySelectorAll("[aria-live]");
    expect(liveRegions).toHaveLength(1);
    // Guard against the toast markup reintroducing a second, overlapping live-region role
    // (e.g. role="status") on top of the container's own aria-live="polite".
    const nestedLiveRoles = liveRegions[0].querySelectorAll('[role="status"], [role="alert"], [aria-live]');
    expect(nestedLiveRoles).toHaveLength(0);
  });

  it("dismisses a toast via its close button", async () => {
    render(
      <ToastProvider>
        <Trigger message="Dismiss me" />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByText("Dismiss me")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
  });
});
