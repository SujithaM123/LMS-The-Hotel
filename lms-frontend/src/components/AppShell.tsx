import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useDismissableOverlay } from "../hooks/useDismissableOverlay";

const TITLES: Array<[string, string]> = [
  ["/dashboard", "Dashboard"],
  ["/courses/new", "Create Course"],
  ["/courses/", "Course Details"],
  ["/courses", "Browse Courses"],
  ["/my-courses", "My Courses"],
  ["/messages", "Messages"],
  ["/notifications", "Notifications"],
  ["/profile", "Profile"],
  ["/admin/users", "Users"],
  ["/admin/courses", "Courses"],
  ["/admin/enrollments", "Enrollments"],
];

function titleFor(pathname: string): string {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix));
  return match?.[1] ?? "LMS Platform";
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useDismissableOverlay({ open: drawerOpen, onClose: () => setDrawerOpen(false) });

  return (
    <div className="app-shell">
      <Sidebar open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />
      <div className={`sidebar-backdrop ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className="app-main-col">
        <TopBar title={titleFor(location.pathname)} onMenuClick={() => setDrawerOpen(true)} />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
