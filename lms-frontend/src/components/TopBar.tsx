import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { IconMenu, IconBell } from "./icons";

export function TopBar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user, role } = useAuth();
  const { connected, unreadCount } = useRealtime();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="topbar">
      <button className="icon-btn topbar-menu-toggle" onClick={onMenuClick} aria-label="Open navigation menu">
        <IconMenu size={22} />
      </button>

      <div className="topbar-title">{title}</div>

      <div className="topbar-actions">
        <span
          className="status-dot"
          style={{ background: connected ? "var(--success)" : "var(--text-tertiary)" }}
          role="status"
          aria-label={connected ? "Live updates connected" : "Live updates offline, reconnecting"}
          title={connected ? "Live" : "Reconnecting…"}
        />

        <Link to="/notifications" className="icon-btn" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}>
          <IconBell size={20} />
          {unreadCount > 0 && (
            <span className="badge" style={{ position: "absolute", top: 4, right: 4 }} aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/profile"
          className="row"
          style={{ gap: "0.5rem", textDecoration: "none", color: "inherit" }}
          aria-label={`View profile, ${user.name}, ${role}`}
        >
          <span className="conversation-avatar" aria-hidden="true">
            {initials}
          </span>
        </Link>
      </div>
    </header>
  );
}
