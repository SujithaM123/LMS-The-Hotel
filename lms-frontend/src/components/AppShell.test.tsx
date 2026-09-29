import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { userId: 1, name: "Test User", email: "test@example.com", role: "STUDENT", token: "x" },
    role: "STUDENT",
    logout: vi.fn(),
  }),
}));

vi.mock("../context/RealtimeContext", () => ({
  useRealtime: () => ({ connected: true, unreadCount: 0 }),
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AppShell>
        <div>Page content</div>
      </AppShell>
    </MemoryRouter>,
  );
}

describe("AppShell mobile drawer", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("opens the drawer when the menu button is clicked", async () => {
    renderShell();
    const nav = screen.getByRole("complementary", { name: "Main navigation" });
    expect(nav.className).not.toContain("open");

    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(nav.className).toContain("open");
  });

  it("locks body scroll while the drawer is open and unlocks when closed", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on Escape", async () => {
    renderShell();
    const nav = screen.getByRole("complementary", { name: "Main navigation" });
    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(nav.className).toContain("open");

    await userEvent.keyboard("{Escape}");
    expect(nav.className).not.toContain("open");
  });

  it("closes when the backdrop is clicked", async () => {
    const { container } = renderShell();
    const nav = screen.getByRole("complementary", { name: "Main navigation" });
    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(nav.className).toContain("open");

    const backdrop = container.querySelector(".sidebar-backdrop")!;
    await userEvent.click(backdrop);
    expect(nav.className).not.toContain("open");
  });

  it("unlocks body scroll on unmount while open", async () => {
    const { unmount } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
